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
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext

/** Puts a secret on the clipboard flagged as sensitive, so the system clipboard preview masks it. */
class AdenaSecureClipboardModule(reactContext: ReactApplicationContext) :
    NativeAdenaSecureClipboardSpec(reactContext), LifecycleEventListener {

  private val handler = Handler(Looper.getMainLooper())
  private val clearTask = Runnable { SecureClipboardExpiry.clearIfExpired(reactApplicationContext) }

  init {
    // Eagerly created at app start: enforces a deadline missed while the process was dead.
    if (!SecureClipboardExpiry.clearIfExpired(reactContext)) {
      SecureClipboardExpiry.remainingMs(reactContext)?.let { handler.postDelayed(clearTask, it) }
    }
    reactContext.addLifecycleEventListener(this)
  }

  override fun getName(): String = NAME

  override fun setSensitiveString(value: String, expiresInMs: Double) {
    val clipboard = reactApplicationContext.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager ?: return
    val delayMs = expiresInMs.toLong().coerceAtLeast(MIN_EXPIRY_MS)
    handler.removeCallbacks(clearTask)
    SecureClipboardExpiry.arm(reactApplicationContext, value, delayMs)

    val clip = ClipData.newPlainText("", value)
    clip.description.extras = PersistableBundle().apply { putBoolean(EXTRA_IS_SENSITIVE, true) }
    clipboard.setPrimaryClip(clip)
    // Fast path while the process lives; the alarm covers process death and deep sleep (uptime pauses).
    handler.postDelayed(clearTask, delayMs)
  }

  override fun onHostResume() {
    SecureClipboardExpiry.clearIfExpired(reactApplicationContext)
  }

  override fun onHostPause() = Unit

  override fun onHostDestroy() = Unit

  override fun invalidate() {
    reactApplicationContext.removeLifecycleEventListener(this)
    handler.removeCallbacks(clearTask)
    super.invalidate()
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
