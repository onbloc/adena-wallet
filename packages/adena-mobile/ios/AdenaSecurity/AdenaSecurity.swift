import Foundation
import React
import UIKit

/// Screen privacy and backup-excluded storage.
///
/// iOS cannot block screenshots, so this module (1) covers the window whenever
/// the app leaves the foreground, so the app switcher snapshot shows nothing,
/// (2) covers it while the screen is being recorded or mirrored and a
/// sensitive screen is open, and (3) tells JS when a screenshot was taken so
/// the UI can warn the user.
@objc(AdenaSecurity)
final class AdenaSecurity: RCTEventEmitter {
  private var hasListeners = false
  private var secureScreenEnabled = false
  private var privacyCover: UIView?

  override init() {
    super.init()
    let center = NotificationCenter.default
    center.addObserver(self, selector: #selector(willResignActive),
                       name: UIApplication.willResignActiveNotification, object: nil)
    center.addObserver(self, selector: #selector(didBecomeActive),
                       name: UIApplication.didBecomeActiveNotification, object: nil)
    center.addObserver(self, selector: #selector(captureStateChanged),
                       name: UIScreen.capturedDidChangeNotification, object: nil)
    center.addObserver(self, selector: #selector(screenshotTaken),
                       name: UIApplication.userDidTakeScreenshotNotification, object: nil)
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  override static func requiresMainQueueSetup() -> Bool { true }

  override func supportedEvents() -> [String]! { ["screenshotTaken"] }

  override func startObserving() { hasListeners = true }

  override func stopObserving() { hasListeners = false }

  @objc(setSecureScreen:)
  func setSecureScreen(_ enabled: Bool) {
    DispatchQueue.main.async {
      self.secureScreenEnabled = enabled
      self.updateCaptureCover()
    }
  }

  @objc(getProtectedStorageDirectory:rejecter:)
  func getProtectedStorageDirectory(_ resolve: RCTPromiseResolveBlock,
                                    rejecter reject: RCTPromiseRejectBlock) {
    do {
      let base = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                             appropriateFor: nil, create: true)
      var directory = base.appendingPathComponent("adena-secure", isDirectory: true)
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true,
                                              attributes: [.protectionKey: FileProtectionType.completeUnlessOpen])
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try directory.setResourceValues(values)
      resolve(directory.path)
    } catch {
      reject("E_PROTECTED_STORAGE", "Could not prepare protected storage", error)
    }
  }

  @objc private func willResignActive() { showCover() }

  @objc private func didBecomeActive() { updateCaptureCover() }

  @objc private func captureStateChanged() { updateCaptureCover() }

  @objc private func screenshotTaken() {
    if hasListeners {
      sendEvent(withName: "screenshotTaken", body: nil)
    }
  }

  private func updateCaptureCover() {
    let capturing = keyWindow()?.screen.isCaptured ?? false
    if secureScreenEnabled && capturing {
      showCover()
    } else {
      hideCover()
    }
  }

  private func showCover() {
    guard privacyCover == nil, let window = keyWindow() else { return }
    let cover = UIView(frame: window.bounds)
    cover.backgroundColor = .systemBackground
    cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    window.addSubview(cover)
    privacyCover = cover
  }

  private func hideCover() {
    privacyCover?.removeFromSuperview()
    privacyCover = nil
  }

  private func keyWindow() -> UIWindow? {
    UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first { $0.isKeyWindow }
  }
}
