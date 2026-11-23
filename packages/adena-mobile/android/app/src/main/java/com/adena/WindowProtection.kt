package com.adena

import android.app.Activity
import android.os.Build
import android.view.WindowManager

/**
 * Wallet windows are always secure: no screenshots, screen recording or recents thumbnail
 * on every API level. RN `Modal` dialogs copy FLAG_SECURE from their activity.
 */
object WindowProtection {
  fun apply(activity: Activity) {
    activity.window.setFlags(
        WindowManager.LayoutParams.FLAG_SECURE,
        WindowManager.LayoutParams.FLAG_SECURE,
    )
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      activity.setRecentsScreenshotEnabled(false)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      activity.window.setHideOverlayWindows(true)
    }
  }

  // Drops touches that pass through another app's overlay (tapjacking).
  fun filterObscuredTouches(activity: Activity) {
    activity.window.decorView.filterTouchesWhenObscured = true
  }
}
