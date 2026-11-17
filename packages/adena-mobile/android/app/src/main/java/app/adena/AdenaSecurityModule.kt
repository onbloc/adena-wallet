package app.adena

import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PersistableBundle
import android.view.WindowManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import java.io.File

/**
 * Screen privacy, backup-excluded storage and secret copies.
 *
 * FLAG_SECURE blocks screenshots, screen recording and casting of the window
 * while a sensitive screen (mnemonic, private key) is open. The protected
 * directory lives under noBackupFilesDir, which Android never backs up.
 */
class AdenaSecurityModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val handler = Handler(Looper.getMainLooper())
  private var pendingClear: Runnable? = null

  override fun getName(): String = NAME

  @ReactMethod
  fun setSecureScreen(enabled: Boolean) {
    UiThreadUtil.runOnUiThread {
      val window = reactContext.currentActivity?.window ?: return@runOnUiThread
      if (enabled) {
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
      } else {
        window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
      }
    }
  }

  @ReactMethod
  fun getProtectedStorageDirectory(promise: Promise) {
    val directory = File(reactContext.noBackupFilesDir, "adena-secure")
    if (directory.isDirectory || directory.mkdirs()) {
      promise.resolve(directory.absolutePath)
    } else {
      promise.reject("E_PROTECTED_STORAGE", "Could not prepare protected storage")
    }
  }

  /**
   * Copies a secret marked sensitive, so the Android 13+ clipboard preview and
   * keyboards hide it, and clears it after [expiresMs]. The timer runs here,
   * not in JS, so it fires while the app is in the background.
   */
  @ReactMethod
  fun copySensitive(text: String, expiresMs: Double) {
    UiThreadUtil.runOnUiThread {
      val clipboard =
        reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
      val clip = ClipData.newPlainText("", text)
      clip.description.extras = PersistableBundle().apply {
        putBoolean(
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ClipDescription.EXTRA_IS_SENSITIVE
          } else {
            "android.content.extra.IS_SENSITIVE"
          },
          true,
        )
      }
      clipboard.setPrimaryClip(clip)
      val copiedAt = copyTimestamp(clipboard)
      pendingClear?.let(handler::removeCallbacks)
      val clear = Runnable {
        pendingClear = null
        // Android 10+ hides the clipboard from apps in the background; clear
        // it then too, since a phrase left behind is worse than a lost copy.
        val current = clipboard.primaryClipDescription
        if (current == null || copiedAt == null || copyTimestamp(clipboard) == copiedAt) {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            clipboard.clearPrimaryClip()
          } else {
            clipboard.setPrimaryClip(ClipData.newPlainText("", ""))
          }
        }
      }
      pendingClear = clear
      handler.postDelayed(clear, expiresMs.toLong())
    }
  }

  private fun copyTimestamp(clipboard: ClipboardManager): Long? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      clipboard.primaryClipDescription?.timestamp
    } else {
      null
    }

  // Required by NativeEventEmitter; this module emits no events on Android.
  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Double) = Unit

  companion object {
    const val NAME = "AdenaSecurity"
  }
}
