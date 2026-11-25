package com.adena.cloudbackup

import android.app.Activity
import android.content.Intent
import com.adena.specs.NativeAdenaCloudBackupSpec
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.google.android.gms.auth.GoogleAuthUtil
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.Scope
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import org.json.JSONArray
import org.json.JSONObject

/**
 * Backup files in the Google Drive appDataFolder: hidden from the user's Drive and readable only by this app.
 * The OAuth access token stays in native code; Drive REST calls run on a background thread.
 */
class AdenaCloudBackupModule(reactContext: ReactApplicationContext) : NativeAdenaCloudBackupSpec(reactContext) {

  private val io: ExecutorService = Executors.newSingleThreadExecutor()
  // Set on the main thread (task listeners), read from the activity callback and the module thread.
  private val pendingSignIn = AtomicReference<Promise?>(null)

  private val activityListener =
      object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
          if (requestCode != REQUEST_AUTHORIZE) return
          val promise = pendingSignIn.getAndSet(null) ?: return
          if (resultCode != Activity.RESULT_OK) {
            promise.reject(E_CANCELED, "Google Drive access was not granted")
            return
          }
          try {
            val result = Identity.getAuthorizationClient(activity).getAuthorizationResultFromIntent(data)
            if (result.accessToken.isNullOrEmpty()) {
              promise.reject(E_NOT_SIGNED_IN, "Google Drive access was not granted")
            } else {
              promise.resolve(null)
            }
          } catch (error: ApiException) {
            promise.reject(E_NOT_SIGNED_IN, "Google Drive authorization failed", error)
          }
        }
      }

  init {
    reactContext.addActivityEventListener(activityListener)
  }

  override fun getName(): String = NAME

  override fun invalidate() {
    reactApplicationContext.removeActivityEventListener(activityListener)
    pendingSignIn.getAndSet(null)?.reject(E_CANCELED, "Google sign-in was interrupted")
    io.shutdown()
    super.invalidate()
  }

  // Only Play services decide this; Drive access is requested later, on tap (signIn). Outdated or updating
  // Play services still count, so the entry stays visible and sign-in reports what to fix.
  override fun isAvailable(promise: Promise) {
    val status =
        runCatching { GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(reactApplicationContext) }
            .getOrDefault(ConnectionResult.SERVICE_MISSING)
    promise.resolve(status in AVAILABLE_STATUSES)
  }

  // A new sign-in supersedes one whose result never arrived (e.g. the consent activity was killed).
  override fun signIn(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject(E_UNAVAILABLE, "No foreground activity for Google sign-in")
      return
    }
    pendingSignIn.getAndSet(null)?.reject(E_CANCELED, "Google sign-in was replaced by a new request")
    Identity.getAuthorizationClient(activity)
        .authorize(authorizationRequest())
        .addOnSuccessListener { result ->
          val pendingIntent = result.pendingIntent
          if (!result.hasResolution() || pendingIntent == null) {
            promise.resolve(null)
            return@addOnSuccessListener
          }
          pendingSignIn.getAndSet(promise)?.reject(E_CANCELED, "Google sign-in was replaced by a new request")
          try {
            activity.startIntentSenderForResult(pendingIntent.intentSender, REQUEST_AUTHORIZE, null, 0, 0, 0, null)
          } catch (error: Exception) {
            if (pendingSignIn.compareAndSet(promise, null)) {
              promise.reject(E_FAILED, "Could not show Google sign-in", error)
            }
          }
        }
        .addOnFailureListener { error ->
          promise.reject(E_UNAVAILABLE, "Google sign-in is not available. Update Google Play services and try again", error)
        }
  }

  override fun list(promise: Promise) = runIo(promise) {
    val files = Arguments.createArray()
    for (file in findFiles(null)) {
      files.pushMap(
          Arguments.createMap().apply {
            putString("name", file.name)
            putDouble("modifiedAt", file.modifiedAt.toDouble())
          },
      )
    }
    files
  }

  override fun read(name: String, promise: Promise) = runIo(promise) {
    val file = findFiles(checkedName(name)).firstOrNull() ?: throw DriveException(E_NOT_FOUND, "The backup file does not exist")
    request("GET", "$DRIVE_FILES/${file.id}?alt=media")
  }

  // Create-only: every backup write is a new immutable file, so a competing write can never replace another copy.
  // Drive stores an upload only when it completes, so a failed upload never leaves a partial file.
  override fun write(name: String, contents: String, promise: Promise) = runIo(promise) {
    if (findFiles(checkedName(name)).isNotEmpty()) throw DriveException(E_FAILED, "The backup file already exists")
    val boundary = "adena-${UUID.randomUUID()}"
    val metadata = JSONObject().put("name", name).put("parents", JSONArray().put(APP_DATA_FOLDER))
    val body =
        "--$boundary\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n$metadata\r\n" +
            "--$boundary\r\nContent-Type: application/json\r\n\r\n$contents\r\n--$boundary--"
    request("POST", "$DRIVE_UPLOAD?uploadType=multipart&fields=id", body, "multipart/related; boundary=$boundary")
    null
  }

  override fun remove(name: String, promise: Promise) = runIo(promise) {
    findFiles(checkedName(name)).forEach { file -> deleteQuietly(file.id) }
    null
  }

  private data class DriveFile(val id: String, val name: String, val modifiedAt: Long)

  private class DriveException(val code: String, message: String, cause: Throwable? = null) : Exception(message, cause)

  private fun runIo(promise: Promise, task: () -> Any?) {
    io.execute {
      try {
        promise.resolve(task())
      } catch (error: DriveException) {
        promise.reject(error.code, error.message, error)
      } catch (error: IOException) {
        promise.reject(E_NETWORK, "Google Drive could not be reached", error)
      } catch (error: Exception) {
        promise.reject(E_FAILED, "The Google Drive backup operation failed", error)
      }
    }
  }

  // Newest first, so a duplicate left by an interrupted create never shadows the latest backup.
  // Follows nextPageToken, bounded so a misbehaving response cannot loop forever.
  private fun findFiles(name: String?): List<DriveFile> {
    val query = if (name == null) "name contains '$FILE_PREFIX' and trashed = false" else "name = '$name' and trashed = false"
    val base =
        "$DRIVE_FILES?spaces=$APP_DATA_FOLDER&pageSize=$PAGE_SIZE&orderBy=modifiedTime%20desc" +
            "&fields=nextPageToken,files(id,name,modifiedTime)&q=${URLEncoder.encode(query, "UTF-8")}"
    val result = mutableListOf<DriveFile>()
    var pageToken: String? = null
    var pages = 0
    do {
      val url = pageToken?.let { "$base&pageToken=${URLEncoder.encode(it, "UTF-8")}" } ?: base
      val response = JSONObject(request("GET", url))
      val files = response.optJSONArray("files") ?: JSONArray()
      (0 until files.length())
          .map { index -> files.getJSONObject(index) }
          .filter { file -> NAME_PATTERN.matches(file.optString("name")) }
          .mapTo(result) { file -> DriveFile(file.getString("id"), file.getString("name"), parseTime(file.optString("modifiedTime"))) }
      pageToken = response.optString("nextPageToken").takeIf { it.isNotEmpty() }
      pages += 1
    } while (pageToken != null && pages < MAX_PAGES)
    return result
  }

  private fun deleteQuietly(id: String) {
    try {
      request("DELETE", "$DRIVE_FILES/$id")
    } catch (error: DriveException) {
      if (error.code != E_NOT_FOUND) throw error
    }
  }

  // A rejected token is evicted from the Play services cache, then retried once with a fresh one.
  private fun request(method: String, url: String, body: String? = null, contentType: String? = null): String {
    val token = accessToken()
    val first = send(method, url, body, contentType, token)
    if (first.first != HttpURLConnection.HTTP_UNAUTHORIZED) return checked(first)
    runCatching { GoogleAuthUtil.clearToken(reactApplicationContext, token) }
    return checked(send(method, url, body, contentType, accessToken()))
  }

  private fun send(method: String, url: String, body: String?, contentType: String?, token: String): Pair<Int, String> {
    val connection = URL(url).openConnection() as HttpURLConnection
    try {
      connection.requestMethod = method
      connection.connectTimeout = TIMEOUT_MS
      connection.readTimeout = TIMEOUT_MS
      connection.setRequestProperty("Authorization", "Bearer $token")
      if (body != null) {
        val bytes = body.toByteArray(Charsets.UTF_8)
        connection.doOutput = true
        connection.setRequestProperty("Content-Type", contentType ?: "application/json")
        connection.setFixedLengthStreamingMode(bytes.size)
        connection.outputStream.use { it.write(bytes) }
      }
      val status = connection.responseCode
      val stream = if (status in 200..299) connection.inputStream else connection.errorStream
      val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
      return status to text
    } finally {
      connection.disconnect()
    }
  }

  private fun checked(response: Pair<Int, String>): String {
    val (status, text) = response
    if (status in 200..299) return text
    val reason =
        runCatching { JSONObject(text).getJSONObject("error").getJSONArray("errors").getJSONObject(0).optString("reason") }
            .getOrDefault("")
    throw when {
      status == HttpURLConnection.HTTP_UNAUTHORIZED -> DriveException(E_NOT_SIGNED_IN, "Google Drive access expired")
      status == HttpURLConnection.HTTP_NOT_FOUND -> DriveException(E_NOT_FOUND, "The backup file does not exist")
      reason == "storageQuotaExceeded" -> DriveException(E_QUOTA, "Google Drive storage is full")
      status == HttpURLConnection.HTTP_FORBIDDEN && reason == "insufficientScopes" ->
          DriveException(E_NOT_SIGNED_IN, "Google Drive access was not granted")
      status == 429 || status >= 500 || reason.endsWith("RateLimitExceeded") ->
          DriveException(E_NETWORK, "Google Drive is busy. Try again later")
      else -> DriveException(E_FAILED, "Google Drive request failed with status $status")
    }
  }

  // Never shows UI: without an earlier grant the caller must run signIn first.
  private fun accessToken(): String {
    val latch = CountDownLatch(1)
    var result: AuthorizationResult? = null
    var failure: Exception? = null
    Identity.getAuthorizationClient(reactApplicationContext)
        .authorize(authorizationRequest())
        .addOnSuccessListener { value ->
          result = value
          latch.countDown()
        }
        .addOnFailureListener { error ->
          failure = error
          latch.countDown()
        }
    if (!latch.await(TIMEOUT_MS.toLong(), TimeUnit.MILLISECONDS)) {
      throw DriveException(E_NETWORK, "Google authorization timed out")
    }
    failure?.let { throw DriveException(E_UNAVAILABLE, "Google authorization is not available", it) }
    val authorized = result
    if (authorized == null || authorized.hasResolution()) {
      throw DriveException(E_NOT_SIGNED_IN, "Google Drive access has not been granted")
    }
    return authorized.accessToken ?: throw DriveException(E_NOT_SIGNED_IN, "Google Drive access has not been granted")
  }

  private fun authorizationRequest(): AuthorizationRequest =
      AuthorizationRequest.builder().setRequestedScopes(listOf(Scope(DRIVE_APPDATA_SCOPE))).build()

  private fun checkedName(name: String): String {
    if (!NAME_PATTERN.matches(name)) throw DriveException(E_FAILED, "Invalid backup file name")
    return name
  }

  private fun parseTime(value: String): Long =
      listOf("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", "yyyy-MM-dd'T'HH:mm:ssXXX").firstNotNullOfOrNull { pattern ->
        runCatching {
              SimpleDateFormat(pattern, Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.parse(value)?.time
            }
            .getOrNull()
      } ?: 0L

  companion object {
    const val NAME = "AdenaCloudBackup"
    private const val REQUEST_AUTHORIZE = 0xADE
    private const val DRIVE_APPDATA_SCOPE = "https://www.googleapis.com/auth/drive.appdata"
    private const val DRIVE_FILES = "https://www.googleapis.com/drive/v3/files"
    private const val DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files"
    private const val APP_DATA_FOLDER = "appDataFolder"
    private const val FILE_PREFIX = "adena-backup-"
    // Single-file names from older apps, or one immutable file per revision: adena-backup-<id>.<revision>-<nonce>.json
    private val NAME_PATTERN = Regex("^adena-backup-[0-9a-f]{32}(\\.(0|[1-9][0-9]{0,14})-[0-9a-f]{16})?\\.json$")
    private const val TIMEOUT_MS = 30_000
    private val AVAILABLE_STATUSES =
        setOf(ConnectionResult.SUCCESS, ConnectionResult.SERVICE_VERSION_UPDATE_REQUIRED, ConnectionResult.SERVICE_UPDATING)
    private const val PAGE_SIZE = 100
    private const val MAX_PAGES = 50
    private const val E_UNAVAILABLE = "E_UNAVAILABLE"
    private const val E_NOT_SIGNED_IN = "E_NOT_SIGNED_IN"
    private const val E_CANCELED = "E_CANCELED"
    private const val E_QUOTA = "E_QUOTA"
    private const val E_NETWORK = "E_NETWORK"
    private const val E_NOT_FOUND = "E_NOT_FOUND"
    private const val E_FAILED = "E_FAILED"
  }
}
