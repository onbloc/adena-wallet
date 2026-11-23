# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# App TurboModules and activities (codegen specs are looked up by name).
-keep class com.adena.** { *; }

# Nitro modules (react-native-mmkv) are bound from C++ through JNI.
-keep class com.margelo.nitro.** { *; }
-keep class com.mrousavy.mmkv.** { *; }

# react-native-keychain cipher storage implementations.
-keep class com.oblador.keychain.** { *; }
