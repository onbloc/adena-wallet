package com.adena

import android.app.Application
import com.adena.biometric.AdenaBiometricVaultPackage
import com.adena.cloudbackup.AdenaCloudBackupPackage
import com.adena.injectsheet.AdenaInjectSheetPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(AdenaInjectSheetPackage())
          add(AdenaBiometricVaultPackage())
          add(AdenaCloudBackupPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
