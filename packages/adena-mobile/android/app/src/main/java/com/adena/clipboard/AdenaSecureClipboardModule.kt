package com.adena.clipboard

import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PersistableBundle
import com.adena.specs.NativeAdenaSecureClipboardSpec
import com.facebook.react.bridge.ReactApplicationContext

/** Puts a secret on the clipboard flagged as sensitive, so the system clipboard preview masks it. */
class AdenaSecureClipboardModule(reactContext: ReactApplicationContext) : NativeAdenaSecureClipboardSpec(reactContext) {

  private val handler = Handler(Looper.getMainLooper())
  private var pendingClear: Runnable? = null

  override fun getName(): String = NAME

  override fun setSensitiveString(value: String, expiresInMs: Double) {
    val clipboard = reactApplicationContext.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager ?: return
    val clip = ClipData.newPlainText("", value)
    clip.description.extras = PersistableBundle().apply { putBoolean(EXTRA_IS_SENSITIVE, true) }
    clipboard.setPrimaryClip(clip)
    scheduleClear(clipboard, value, expiresInMs.toLong().coerceAtLeast(MIN_EXPIRY_MS))
  }

  // JS timers pause while the app is backgrounded, so the deadline runs on the main looper instead.
  private fun scheduleClear(clipboard: ClipboardManager, value: String, delayMs: Long) {
    pendingClear?.let(handler::removeCallbacks)
    val task = Runnable {
      pendingClear = null
      // Android 10+ hides the clipboard from background apps (null); clearing then beats leaving the secret.
      val current = runCatching { clipboard.primaryClip?.getItemAt(0)?.text?.toString() }.getOrNull()
      if (current == null || current == value) {
        clear(clipboard)
      }
    }
    pendingClear = task
    handler.postDelayed(task, delayMs)
  }

  private fun clear(clipboard: ClipboardManager) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      clipboard.clearPrimaryClip()
    } else {
      clipboard.setPrimaryClip(ClipData.newPlainText("", ""))
    }
  }

  companion object {
    const val NAME = "AdenaSecureClipboard"
    private const val MIN_EXPIRY_MS = 1_000L

    // The extra is honored from API 33; older versions ignore it.
    private val EXTRA_IS_SENSITIVE =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) ClipDescription.EXTRA_IS_SENSITIVE
        else "android.content.extra.IS_SENSITIVE"
  }
}
