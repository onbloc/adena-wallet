package com.adenamobile

import android.view.WindowManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import java.io.File

/**
 * Screen privacy and backup-excluded storage.
 *
 * FLAG_SECURE blocks screenshots, screen recording and casting of the window
 * while a sensitive screen (mnemonic, private key) is open. The protected
 * directory lives under noBackupFilesDir, which Android never backs up.
 */
class AdenaSecurityModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

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

  // Required by NativeEventEmitter; this module emits no events on Android.
  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Double) = Unit

  companion object {
    const val NAME = "AdenaSecurity"
  }
}
