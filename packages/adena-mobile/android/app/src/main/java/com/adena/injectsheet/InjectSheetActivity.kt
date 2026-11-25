package com.adena.injectsheet

import android.content.Intent
import android.os.Build
import android.os.Bundle
import com.adena.WindowProtection
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Translucent activity that handles `adena://request` links on top of the calling dApp.
 * It joins the caller's task, so finishing it returns the user straight to the dApp.
 */
class InjectSheetActivity : ReactActivity() {

  // Identifies this sheet to JS; native calls carrying another token never touch it.
  val sheetToken: String = UUID.randomUUID().toString()

  // Launching package as reported by the system; null when Android does not tell.
  var callerPackage: String? = null
    private set

  private var dismissRequested = false

  // Set by JS while an approval signs or broadcasts; back must not close the sheet then.
  @Volatile var busy = false

  private val answered = AtomicBoolean(false)

  /** True only for the first complete or dismiss of this sheet. */
  fun claimAnswer(): Boolean = answered.compareAndSet(false, true)

  override fun onCreate(savedInstanceState: Bundle?) {
    WindowProtection.apply(this)
    callerPackage = systemCallerPackage()
    AdenaInjectSheetModule.register(sheetToken, this)
    // react-native-screens cannot restore fragments, so saved state is not passed on.
    super.onCreate(null)
    WindowProtection.filterObscuredTouches(this)
  }

  override fun onDestroy() {
    AdenaInjectSheetModule.unregister(sheetToken)
    super.onDestroy()
  }

  // Back answers the dApp with a rejection through JS; a second press closes even if JS is stuck,
  // unless an approval is in flight.
  override fun invokeDefaultOnBackPressed() {
    if (busy) {
      return
    }
    if (!dismissRequested && AdenaInjectSheetModule.requestDismiss(sheetToken)) {
      dismissRequested = true
      return
    }
    super.invokeDefaultOnBackPressed()
  }

  override fun getMainComponentName(): String = COMPONENT_NAME

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
        override fun getLaunchOptions(): Bundle =
            Bundle().apply {
              putString("requestUrl", intent?.dataString)
              putString("sheetToken", sheetToken)
              callerPackage?.let { putString("callerPackage", it) }
            }
      }

  // EXTRA_REFERRER(_NAME) are set by the caller, so they are dropped before asking for the referrer;
  // what remains is the package the system recorded as the launcher.
  private fun systemCallerPackage(): String? {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      launchedFromPackage?.takeIf { it != packageName }?.let { return it }
    }
    intent?.removeExtra(Intent.EXTRA_REFERRER)
    intent?.removeExtra(Intent.EXTRA_REFERRER_NAME)
    val referrer = referrer ?: return null
    return if (referrer.scheme == "android-app") referrer.host?.takeIf { it != packageName } else null
  }

  companion object {
    const val COMPONENT_NAME = "AdenaInjectSheet"
  }
}
