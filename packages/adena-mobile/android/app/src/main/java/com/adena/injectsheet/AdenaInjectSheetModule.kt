package com.adena.injectsheet

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import com.adena.specs.NativeAdenaInjectSheetSpec
import com.facebook.react.bridge.ReactApplicationContext

/** Ends the inject sheet: returns the response to the caller or opens the dApp callback. */
class AdenaInjectSheetModule(reactContext: ReactApplicationContext) : NativeAdenaInjectSheetSpec(reactContext) {

  override fun getName(): String = NAME

  override fun complete(callbackUrl: String) {
    val activity = sheetActivity() ?: return
    activity.runOnUiThread {
      if (activity.callingActivity != null) {
        activity.setResult(
            Activity.RESULT_OK,
            Intent().setData(Uri.parse(callbackUrl)).putExtra(EXTRA_RESPONSE_URL, callbackUrl),
        )
      } else if (isAllowedCallback(callbackUrl)) {
        try {
          activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(callbackUrl)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: ActivityNotFoundException) {
          // The dApp disappeared; finishing still returns to the previous screen.
        }
      }
      activity.finish()
    }
  }

  override fun dismiss() {
    val activity = sheetActivity() ?: return
    activity.runOnUiThread {
      activity.setResult(Activity.RESULT_CANCELED)
      activity.finish()
    }
  }

  // Only the sheet may be finished from JS; the main wallet activity is never closed this way.
  private fun sheetActivity(): InjectSheetActivity? = reactApplicationContext.currentActivity as? InjectSheetActivity

  // Defence in depth: the JS protocol already restricts callbacks to https and app schemes.
  private fun isAllowedCallback(url: String): Boolean {
    val scheme = Uri.parse(url).scheme?.lowercase() ?: return false
    return scheme !in BLOCKED_SCHEMES
  }

  companion object {
    const val NAME = "AdenaInjectSheet"
    const val EXTRA_RESPONSE_URL = "com.adena.extra.RESPONSE_URL"
    private val BLOCKED_SCHEMES = setOf("http", "javascript", "data", "file", "content", "intent", "android-app", "adena")
  }
}
