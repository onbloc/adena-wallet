package com.adena.clipboard

import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import android.os.PersistableBundle
import com.adena.specs.NativeAdenaSecureClipboardSpec
import com.facebook.react.bridge.ReactApplicationContext

/** Puts a secret on the clipboard flagged as sensitive, so the system clipboard preview masks it. */
class AdenaSecureClipboardModule(reactContext: ReactApplicationContext) : NativeAdenaSecureClipboardSpec(reactContext) {

  override fun getName(): String = NAME

  // Expiry is enforced by the JS timer; Android has no per-clip expiration.
  override fun setSensitiveString(value: String, expiresInMs: Double) {
    val clipboard = reactApplicationContext.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager ?: return
    val clip = ClipData.newPlainText("", value)
    clip.description.extras = PersistableBundle().apply { putBoolean(EXTRA_IS_SENSITIVE, true) }
    clipboard.setPrimaryClip(clip)
  }

  companion object {
    const val NAME = "AdenaSecureClipboard"

    // The extra is honored from API 33; older versions ignore it.
    private val EXTRA_IS_SENSITIVE =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) ClipDescription.EXTRA_IS_SENSITIVE
        else "android.content.extra.IS_SENSITIVE"
  }
}
