package app.adena

import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.uimanager.UIManagerHelper

/**
 * Runs the dApp provider before any page script.
 *
 * react-native-webview evaluates injectedJavaScriptBeforeContentLoaded from
 * onPageStarted on Android, which can run after the page's first scripts, so
 * a site that looks for window.adena on load sees no wallet. A document-start
 * script runs before them, as WKUserScript does on iOS. It applies to every
 * frame; the script itself bails out outside the top frame.
 */
class AdenaWebViewModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  /** Resolves false when the system WebView cannot run document-start scripts. */
  @ReactMethod
  fun addDocumentStartScript(viewTag: Double, script: String, promise: Promise) {
    if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
      promise.resolve(false)
      return
    }
    UiThreadUtil.runOnUiThread {
      try {
        val tag = viewTag.toInt()
        val view = UIManagerHelper.getUIManagerForReactTag(reactContext, tag)?.resolveView(tag)
        val webView = view?.let(::findWebView)
        if (webView == null) {
          promise.reject("E_NO_WEBVIEW", "No WebView for this tag")
          return@runOnUiThread
        }
        WebViewCompat.addDocumentStartJavaScript(webView, script, setOf("*"))
        promise.resolve(true)
      } catch (error: Exception) {
        promise.reject("E_DOCUMENT_START_SCRIPT", error)
      }
    }
  }

  // The react-native-webview view is a wrapper around the WebView.
  private fun findWebView(view: View): WebView? {
    if (view is WebView) return view
    if (view is ViewGroup) {
      for (index in 0 until view.childCount) {
        findWebView(view.getChildAt(index))?.let { return it }
      }
    }
    return null
  }

  companion object {
    const val NAME = "AdenaWebView"
  }
}
