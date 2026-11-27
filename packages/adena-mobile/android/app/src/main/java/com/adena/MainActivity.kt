package com.adena

import android.content.res.Configuration
import android.os.Bundle
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    WindowProtection.apply(this)
    // react-native-screens cannot restore fragments, so saved state is not passed on.
    super.onCreate(null)
    WindowProtection.filterObscuredTouches(this)
    applyNavigationBarAppearance(resources.configuration)
  }

  // uiMode is handled in place, so a theme switch (OS or Appearance.setColorScheme) lands here.
  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    applyNavigationBarAppearance(newConfig)
  }

  // Edge-to-edge sets the navigation bar icons once at launch; keep them readable after a switch.
  private fun applyNavigationBarAppearance(config: Configuration) {
    val night = config.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
    window.setBackgroundDrawableResource(R.color.window_background)
    WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightNavigationBars = !night
  }

  override fun getMainComponentName(): String = "Adena"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
