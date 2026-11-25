package com.adena.injectsheet

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import com.adena.specs.NativeAdenaInjectSheetSpec
import com.facebook.react.bridge.ReactApplicationContext
import java.lang.ref.WeakReference
import java.util.Collections
import java.util.concurrent.ConcurrentHashMap

/** Ends an inject sheet, addressed by its launch token: opens the dApp callback with the response, or just closes. */
class AdenaInjectSheetModule(reactContext: ReactApplicationContext) : NativeAdenaInjectSheetSpec(reactContext) {

  init {
    instance = WeakReference(this)
  }

  override fun getName(): String = NAME

  override fun complete(sheetToken: String, callbackUrl: String) {
    val caller = launched.remove(sheetToken)
    val activity = sheet(sheetToken)
    if (activity == null) {
      // The sheet closed while JS was still signing; the dApp must still get the result.
      // Without a caller entry the token is unknown or already answered.
      if (caller != null && isAllowedCallback(callbackUrl)) {
        openCallback(reactApplicationContext.applicationContext, Uri.parse(callbackUrl), caller.packageName)
      }
      return
    }
    // Each live sheet answers once, even if its caller entry is gone.
    if (!activity.claimAnswer()) return
    val callerPackage = caller?.packageName ?: activity.callerPackage
    activity.runOnUiThread {
      // The response goes only to the callback the user reviewed, never back to the launching app:
      // a caller can claim any callback origin, so a result intent would hand it another origin's response.
      activity.setResult(Activity.RESULT_OK)
      if (isAllowedCallback(callbackUrl)) {
        openCallback(activity, Uri.parse(callbackUrl), callerPackage)
      }
      activity.finish()
    }
  }

  override fun dismiss(sheetToken: String) {
    launched.remove(sheetToken)
    val activity = sheet(sheetToken) ?: return
    activity.claimAnswer()
    activity.runOnUiThread {
      activity.setResult(Activity.RESULT_CANCELED)
      activity.finish()
    }
  }

  override fun setBusy(sheetToken: String, busy: Boolean) {
    sheets[sheetToken]?.get()?.busy = busy
  }

  // BROWSABLE limits the callback to components that accept untrusted links. An app callback
  // without it is still delivered, but only to the package that launched the sheet.
  private fun openCallback(context: Context, uri: Uri, callerPackage: String?) {
    val browsable = Intent(Intent.ACTION_VIEW, uri)
        .addCategory(Intent.CATEGORY_BROWSABLE)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      context.startActivity(browsable)
      return
    } catch (_: ActivityNotFoundException) {
      // Falls through to the caller-scoped attempt below.
    }
    val caller = callerPackage ?: return
    try {
      context.startActivity(Intent(Intent.ACTION_VIEW, uri).setPackage(caller).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (_: ActivityNotFoundException) {
      // The dApp disappeared; finishing still returns to the previous screen.
    }
  }

  private fun sheet(token: String): InjectSheetActivity? = sheets[token]?.get()?.takeUnless { it.isFinishing }

  // Defence in depth: the JS protocol already restricts callbacks to https and app schemes.
  private fun isAllowedCallback(url: String): Boolean {
    val scheme = Uri.parse(url).scheme?.lowercase() ?: return false
    return scheme !in BLOCKED_SCHEMES
  }

  companion object {
    const val NAME = "AdenaInjectSheet"

    // Keep equal to BLOCKED_CALLBACK_SCHEMES in src/deeplink/dapp-protocol.ts (checked by a unit test).
    private val BLOCKED_SCHEMES = setOf(
        "http", "javascript", "vbscript", "data", "file", "about", "blob", "filesystem", "content",
        "intent", "android-app", "market", "itms", "itms-apps", "itms-appss", "itms-services",
        "tel", "telprompt", "sms", "smsto", "mms", "mmsto", "mailto", "facetime", "facetime-audio",
        "adena",
    )

    private const val MAX_LAUNCHED = 32

    private class Caller(val packageName: String?)

    private val sheets = ConcurrentHashMap<String, WeakReference<InjectSheetActivity>>()
    // Outlives the activity so a late complete can still reach the callback; answered once. The cap evicts
    // only entries whose sheet is gone, so a live sheet always keeps its caller.
    private val launched: MutableMap<String, Caller> = Collections.synchronizedMap(LinkedHashMap())
    @Volatile private var instance: WeakReference<AdenaInjectSheetModule>? = null

    fun register(token: String, activity: InjectSheetActivity) {
      sheets[token] = WeakReference(activity)
      synchronized(launched) {
        launched[token] = Caller(activity.callerPackage)
        var excess = launched.size - MAX_LAUNCHED
        val tokens = launched.keys.iterator()
        while (excess > 0 && tokens.hasNext()) {
          if (sheets[tokens.next()]?.get() == null) {
            tokens.remove()
            excess--
          }
        }
      }
    }

    fun unregister(token: String) {
      sheets.remove(token)
    }

    /** Asks JS to answer the dApp for this sheet; false when no module is alive to receive it. */
    fun requestDismiss(token: String): Boolean {
      val module = instance?.get() ?: return false
      if (!module.reactApplicationContext.hasActiveReactInstance()) {
        return false
      }
      module.emitOnDismissRequest(token)
      return true
    }
  }
}
