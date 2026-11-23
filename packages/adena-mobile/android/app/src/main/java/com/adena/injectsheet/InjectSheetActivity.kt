package com.adena.injectsheet

import android.os.Bundle
import com.adena.WindowProtection
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

/**
 * Translucent activity that handles `adena://request` links on top of the calling dApp.
 * It joins the caller's task, so finishing it returns the user straight to the dApp.
 */
class InjectSheetActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    WindowProtection.apply(this)
    // react-native-screens cannot restore fragments, so saved state is not passed on.
    super.onCreate(null)
    WindowProtection.filterObscuredTouches(this)
  }

  override fun getMainComponentName(): String = COMPONENT_NAME

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
        override fun getLaunchOptions(): Bundle =
            Bundle().apply {
              putString("requestUrl", intent?.dataString)
            }
      }

  companion object {
    const val COMPONENT_NAME = "AdenaInjectSheet"
  }
}
