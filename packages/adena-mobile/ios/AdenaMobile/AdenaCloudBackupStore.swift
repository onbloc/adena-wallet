import Foundation

/// Backup files in the app's own iCloud container (`Documents`), which iCloud Drive does not show
/// because Info.plist declares no NSUbiquitousContainers entry. All file work runs off the main thread.
@objc(AdenaCloudBackupStore)
public final class AdenaCloudBackupStore: NSObject {
  @objc public static let errorCodeKey = "code"

  private static let errorDomain = "AdenaCloudBackup"
  // Single-file names from older apps, or one immutable file per revision: adena-backup-<id>.<revision>-<nonce>.json
  private static let namePattern = try! NSRegularExpression(
    pattern: "^adena-backup-[0-9a-f]{32}(\\.(0|[1-9][0-9]{0,14})-[0-9a-f]{16})?\\.json$"
  )
  private static let placeholderPrefix = "."
  private static let placeholderSuffix = ".icloud"

  private static let metadataTimeout: TimeInterval = 10

  private let queue = DispatchQueue(label: "com.adena.cloud-backup", qos: .userInitiated)
  private let fileManager = FileManager()

  @objc public func isAvailable(_ completion: @escaping (Bool) -> Void) {
    queue.async {
      completion(self.fileManager.ubiquityIdentityToken != nil && (try? self.documentsURL()) != nil)
    }
  }

  // A fresh install may not have the container's metadata yet, so the directory alone can look empty:
  // the iCloud metadata index is queried too and placeholders start downloading. An index that does not
  // answer in time fails the listing, since the directory alone could hide a backup that exists.
  @objc public func list(_ completion: @escaping ([[String: Any]]?, NSError?) -> Void) {
    queue.async {
      do {
        let documents = try self.documentsURL()
        var files = self.listDirectory(documents)
        guard let metadata = self.queryMetadata(timeout: Self.metadataTimeout) else {
          throw Self.failure("E_NETWORK", "iCloud did not finish listing the backups")
        }
        for (name, entry) in metadata {
          files[name] = max(files[name] ?? 0, entry.modifiedAt)
          if !entry.downloaded {
            try? self.fileManager.startDownloadingUbiquitousItem(at: entry.url)
          }
        }
        completion(files.map { ["name": $0.key, "modifiedAt": $0.value] }, nil)
      } catch {
        completion(nil, Self.wrap(error))
      }
    }
  }

  private func listDirectory(_ documents: URL) -> [String: Double] {
    let urls = (try? fileManager.contentsOfDirectory(
      at: documents,
      includingPropertiesForKeys: [.contentModificationDateKey],
      options: []
    )) ?? []
    var files: [String: Double] = [:]
    for url in urls {
      guard let name = Self.backupName(fromListedName: url.lastPathComponent) else { continue }
      let modified = (try? url.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate
      files[name] = max(files[name] ?? 0, (modified?.timeIntervalSince1970 ?? 0) * 1000)
    }
    return files
  }

  // NSMetadataQuery needs a run loop, so it runs on the main queue while this (background) thread waits.
  // Returns what was gathered, or nil when the query cannot start or does not answer in time.
  private func queryMetadata(timeout: TimeInterval) -> [String: MetadataEntry]? {
    let done = DispatchSemaphore(value: 0)
    let box = MetadataBox()
    DispatchQueue.main.async {
      let query = NSMetadataQuery()
      query.searchScopes = [NSMetadataQueryUbiquitousDocumentsScope]
      query.predicate = NSPredicate(format: "%K LIKE %@", NSMetadataItemFSNameKey, "adena-backup-*.json")
      box.query = query
      box.observer = NotificationCenter.default.addObserver(
        forName: .NSMetadataQueryDidFinishGathering, object: query, queue: .main
      ) { _ in
        query.disableUpdates()
        var entries: [String: MetadataEntry] = [:]
        for case let item as NSMetadataItem in query.results {
          guard let name = item.value(forAttribute: NSMetadataItemFSNameKey) as? String, Self.isBackupName(name),
                let url = item.value(forAttribute: NSMetadataItemURLKey) as? URL else { continue }
          let modified = item.value(forAttribute: NSMetadataItemFSContentChangeDateKey) as? Date
          let status = item.value(forAttribute: NSMetadataUbiquitousItemDownloadingStatusKey) as? String
          entries[name] = MetadataEntry(
            url: url,
            modifiedAt: (modified?.timeIntervalSince1970 ?? 0) * 1000,
            downloaded: status == NSMetadataUbiquitousItemDownloadingStatusCurrent
          )
        }
        box.entries = entries
        box.finish()
        done.signal()
      }
      if !query.start() {
        box.finish()
        done.signal()
      }
    }
    if done.wait(timeout: .now() + timeout) == .timedOut {
      DispatchQueue.main.async { box.finish() }
      return nil
    }
    return box.entries
  }

  @objc(readName:completion:)
  public func read(_ name: String, completion: @escaping (String?, NSError?) -> Void) {
    queue.async {
      do {
        let url = try self.fileURL(name)
        // A file not downloaded to this device yet is fetched; the coordinated read waits for it. iCloud accepts
        // the request for an item it knows even before a local placeholder exists (fresh install).
        let downloadRequested = (try? self.fileManager.startDownloadingUbiquitousItem(at: url)) != nil
        guard self.exists(url) || downloadRequested else {
          throw Self.failure("E_NOT_FOUND", "The backup file does not exist")
        }
        var contents: String?
        var readError: Error?
        try self.coordinate { coordinator, coordinationError in
          coordinator.coordinate(readingItemAt: url, options: [], error: coordinationError) { readURL in
            do {
              contents = try String(contentsOf: readURL, encoding: .utf8)
            } catch {
              readError = error
            }
          }
        }
        if let readError { throw readError }
        guard let contents else { throw Self.failure("E_FAILED", "The backup file could not be read") }
        completion(contents, nil)
      } catch {
        completion(nil, Self.wrap(error))
      }
    }
  }

  @objc(writeName:contents:completion:)
  public func write(_ name: String, contents: String, completion: @escaping (NSError?) -> Void) {
    queue.async {
      // Staged in the app's temporary directory, excluded from device backups and removed afterwards.
      var staging = self.fileManager.temporaryDirectory.appendingPathComponent("\(UUID().uuidString).json")
      defer { try? self.fileManager.removeItem(at: staging) }
      do {
        let destination = try self.fileURL(name)
        guard let data = contents.data(using: .utf8) else {
          throw Self.failure("E_FAILED", "The backup could not be encoded")
        }
        // Not .completeFileProtection: the class would carry into the iCloud file and stall uploads while locked.
        // The contents are already encrypted with the backup password.
        try data.write(to: staging, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try staging.setResourceValues(values)

        // Create-only: every backup write is a new immutable file, so a competing write never replaces another copy.
        guard !self.exists(destination) else {
          throw Self.failure("E_FAILED", "The backup file already exists")
        }
        var writeError: Error?
        try self.coordinate { coordinator, coordinationError in
          coordinator.coordinate(writingItemAt: destination, options: [], error: coordinationError) { writeURL in
            do {
              // Fails instead of replacing when the file appeared meanwhile; a reader never sees a partial file.
              try self.fileManager.moveItem(at: staging, to: writeURL)
            } catch {
              writeError = error
            }
          }
        }
        if let writeError { throw writeError }
        completion(nil)
      } catch {
        completion(Self.wrap(error))
      }
    }
  }

  // iCloud uploads a written file in the background, so a local copy alone is not a backup yet.
  // A file present only as a placeholder came from iCloud and counts as uploaded.
  @objc(uploadStatusName:completion:)
  public func uploadStatus(_ name: String, completion: @escaping (String?, NSError?) -> Void) {
    queue.async {
      do {
        var url = try self.fileURL(name)
        guard self.exists(url) else {
          throw Self.failure("E_NOT_FOUND", "The backup file does not exist")
        }
        guard self.fileManager.fileExists(atPath: url.path) else {
          completion("uploaded", nil)
          return
        }
        url.removeAllCachedResourceValues()
        let values = try url.resourceValues(forKeys: [
          .ubiquitousItemIsUploadedKey, .ubiquitousItemIsUploadingKey, .ubiquitousItemUploadingErrorKey,
        ])
        if let uploadError = values.ubiquitousItemUploadingError { throw uploadError }
        completion(values.ubiquitousItemIsUploaded == true ? "uploaded" : "uploading", nil)
      } catch {
        completion(nil, Self.wrap(error))
      }
    }
  }

  @objc(removeName:completion:)
  public func remove(_ name: String, completion: @escaping (NSError?) -> Void) {
    queue.async {
      do {
        let url = try self.fileURL(name)
        let placeholder = url.deletingLastPathComponent()
          .appendingPathComponent(Self.placeholderPrefix + name + Self.placeholderSuffix)
        var removeError: Error?
        for target in [url, placeholder] where self.fileManager.fileExists(atPath: target.path) {
          try self.coordinate { coordinator, coordinationError in
            coordinator.coordinate(writingItemAt: target, options: .forDeleting, error: coordinationError) { deleteURL in
              do {
                try self.fileManager.removeItem(at: deleteURL)
              } catch {
                removeError = error
              }
            }
          }
          if let removeError { throw removeError }
        }
        completion(nil)
      } catch {
        completion(Self.wrap(error))
      }
    }
  }

  // nil = the first container in the entitlements (iCloud.com.adena). Blocks, so never on the main thread.
  private func documentsURL() throws -> URL {
    guard fileManager.ubiquityIdentityToken != nil,
          let container = fileManager.url(forUbiquityContainerIdentifier: nil) else {
      throw Self.failure("E_UNAVAILABLE", "iCloud is not available")
    }
    let documents = container.appendingPathComponent("Documents", isDirectory: true)
    try fileManager.createDirectory(at: documents, withIntermediateDirectories: true)
    return documents
  }

  private func fileURL(_ name: String) throws -> URL {
    guard Self.isBackupName(name) else {
      throw Self.failure("E_FAILED", "Invalid backup file name")
    }
    return try documentsURL().appendingPathComponent(name, isDirectory: false)
  }

  // Counts a file that exists only as an iCloud placeholder (not downloaded yet).
  private func exists(_ url: URL) -> Bool {
    if fileManager.fileExists(atPath: url.path) { return true }
    let placeholder = url.deletingLastPathComponent()
      .appendingPathComponent(Self.placeholderPrefix + url.lastPathComponent + Self.placeholderSuffix)
    return fileManager.fileExists(atPath: placeholder.path)
  }

  private func coordinate(_ body: (NSFileCoordinator, NSErrorPointer) -> Void) throws {
    var coordinationError: NSError?
    body(NSFileCoordinator(filePresenter: nil), &coordinationError)
    if let coordinationError { throw coordinationError }
  }

  private static func backupName(fromListedName listed: String) -> String? {
    var name = listed
    if name.hasPrefix(placeholderPrefix) && name.hasSuffix(placeholderSuffix) {
      name = String(name.dropFirst(placeholderPrefix.count).dropLast(placeholderSuffix.count))
    }
    return isBackupName(name) ? name : nil
  }

  private static func isBackupName(_ name: String) -> Bool {
    namePattern.firstMatch(in: name, range: NSRange(name.startIndex..., in: name)) != nil
  }

  private static func failure(_ code: String, _ message: String, _ underlying: Error? = nil) -> NSError {
    var info: [String: Any] = [errorCodeKey: code, NSLocalizedDescriptionKey: message]
    if let underlying { info[NSUnderlyingErrorKey] = underlying }
    return NSError(domain: errorDomain, code: 0, userInfo: info)
  }

  private static func wrap(_ error: Error) -> NSError {
    let nsError = error as NSError
    if nsError.domain == errorDomain { return nsError }
    if nsError.domain == NSCocoaErrorDomain {
      switch nsError.code {
      case NSFileWriteOutOfSpaceError:
        return failure("E_QUOTA", "Not enough storage", error)
      case NSFileNoSuchFileError, NSFileReadNoSuchFileError:
        return failure("E_NOT_FOUND", "The backup file does not exist", error)
      case NSUbiquitousFileNotUploadedDueToQuotaError:
        return failure("E_QUOTA", "iCloud storage is full", error)
      case NSUbiquitousFileUnavailableError:
        return failure("E_UNAVAILABLE", "iCloud is not available", error)
      case NSUbiquitousFileUbiquityServerNotAvailable:
        return failure("E_NETWORK", "iCloud could not be reached", error)
      default:
        break
      }
    }
    if nsError.domain == NSURLErrorDomain {
      return failure("E_NETWORK", "iCloud could not be reached", error)
    }
    return failure("E_FAILED", "The iCloud backup operation failed", error)
  }
}

private struct MetadataEntry {
  let url: URL
  let modifiedAt: Double
  let downloaded: Bool
}

/// State of one metadata query, touched only on the main queue (and read after its semaphore fires).
private final class MetadataBox: @unchecked Sendable {
  var query: NSMetadataQuery?
  var observer: NSObjectProtocol?
  // Stays nil when the query could not start.
  var entries: [String: MetadataEntry]?

  func finish() {
    query?.stop()
    if let observer { NotificationCenter.default.removeObserver(observer) }
    query = nil
    observer = nil
  }
}
