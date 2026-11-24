package com.adena.biometric

import android.os.Build
import android.os.Handler
import android.os.Looper
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import com.adena.specs.NativeAdenaBiometricVaultSpec
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import java.security.KeyStore
import java.util.concurrent.Executor
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Seals a secret with a Keystore AES-GCM key that strong biometrics must authorize on every use
 * (no validity window, no device-credential fallback) and that a new enrollment invalidates.
 */
class AdenaBiometricVaultModule(reactContext: ReactApplicationContext) :
    NativeAdenaBiometricVaultSpec(reactContext) {

  override fun getName(): String = NAME

  override fun seal(alias: String, plaintext: String, title: String, subtitle: String, cancel: String, promise: Promise) {
    if (!canAuthenticate()) {
      promise.reject(E_UNAVAILABLE, "Strong biometric authentication is not available")
      return
    }
    val cipher =
        try {
          keyStore().deleteEntry(alias)
          Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.ENCRYPT_MODE, createKey(alias)) }
        } catch (error: Exception) {
          promise.reject(E_FAILED, "Could not create the biometric key", error)
          return
        }
    authenticate(cipher, title, subtitle, cancel, promise) { authorized ->
      val iv = authorized.iv
      val ciphertext = authorized.doFinal(plaintext.toByteArray(Charsets.UTF_8))
      Base64.encodeToString(iv + ciphertext, Base64.NO_WRAP)
    }
  }

  override fun unseal(alias: String, sealed: String, title: String, subtitle: String, cancel: String, promise: Promise) {
    val bytes =
        try {
          Base64.decode(sealed, Base64.NO_WRAP)
        } catch (error: IllegalArgumentException) {
          promise.reject(E_FAILED, "The sealed value is malformed", error)
          return
        }
    if (bytes.size <= IV_LENGTH) {
      promise.reject(E_FAILED, "The sealed value is malformed")
      return
    }
    val cipher =
        try {
          val key = keyStore().getKey(alias, null) as? SecretKey
          if (key == null) {
            promise.reject(E_KEY_INVALIDATED, "The biometric key is missing")
            return
          }
          Cipher.getInstance(TRANSFORMATION).apply {
            init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(TAG_LENGTH_BITS, bytes, 0, IV_LENGTH))
          }
        } catch (error: KeyPermanentlyInvalidatedException) {
          runCatching { keyStore().deleteEntry(alias) }
          promise.reject(E_KEY_INVALIDATED, "Biometric enrollment changed", error)
          return
        } catch (error: Exception) {
          promise.reject(E_FAILED, "Could not prepare the biometric key", error)
          return
        }
    authenticate(cipher, title, subtitle, cancel, promise) { authorized ->
      String(authorized.doFinal(bytes, IV_LENGTH, bytes.size - IV_LENGTH), Charsets.UTF_8)
    }
  }

  override fun deleteKey(alias: String, promise: Promise) {
    try {
      keyStore().deleteEntry(alias)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject(E_FAILED, "Could not delete the biometric key", error)
    }
  }

  private fun canAuthenticate(): Boolean =
      BiometricManager.from(reactApplicationContext).canAuthenticate(BIOMETRIC_STRONG) ==
          BiometricManager.BIOMETRIC_SUCCESS

  private fun keyStore(): KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }

  private fun createKey(alias: String): SecretKey {
    val builder =
        KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(KEY_SIZE_BITS)
            .setUserAuthenticationRequired(true)
            .setInvalidatedByBiometricEnrollment(true)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      // 0 = every operation needs its own BiometricPrompt; device credential is not accepted.
      builder.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG)
    } else {
      // -1 = per-operation biometric authentication on API < 30.
      @Suppress("DEPRECATION")
      builder.setUserAuthenticationValidityDurationSeconds(-1)
    }
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
    generator.init(builder.build())
    return generator.generateKey()
  }

  private fun authenticate(
      cipher: Cipher,
      title: String,
      subtitle: String,
      cancel: String,
      promise: Promise,
      finish: (Cipher) -> String,
  ) {
    val activity = reactApplicationContext.currentActivity as? FragmentActivity
    if (activity == null) {
      promise.reject(E_UNAVAILABLE, "No foreground activity for the biometric prompt")
      return
    }
    val mainHandler = Handler(Looper.getMainLooper())
    val executor = Executor { command -> mainHandler.post(command) }
    val callback =
        object : BiometricPrompt.AuthenticationCallback() {
          override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
            val authorized = result.cryptoObject?.cipher
            if (authorized == null) {
              promise.reject(E_FAILED, "Biometric prompt returned no cipher")
              return
            }
            try {
              promise.resolve(finish(authorized))
            } catch (error: Exception) {
              promise.reject(E_FAILED, "Biometric crypto operation failed", error)
            }
          }

          override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
            promise.reject(errorCodeFor(errorCode), errString.toString())
          }
        }
    mainHandler.post {
      try {
        val info =
            BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(subtitle.ifEmpty { null })
                .setNegativeButtonText(cancel)
                .setAllowedAuthenticators(BIOMETRIC_STRONG)
                .setConfirmationRequired(false)
                .build()
        BiometricPrompt(activity, executor, callback).authenticate(info, BiometricPrompt.CryptoObject(cipher))
      } catch (error: Exception) {
        promise.reject(E_FAILED, "Could not show the biometric prompt", error)
      }
    }
  }

  private fun errorCodeFor(errorCode: Int): String =
      when (errorCode) {
        BiometricPrompt.ERROR_USER_CANCELED,
        BiometricPrompt.ERROR_NEGATIVE_BUTTON,
        BiometricPrompt.ERROR_CANCELED,
        BiometricPrompt.ERROR_TIMEOUT -> E_CANCELED
        BiometricPrompt.ERROR_LOCKOUT,
        BiometricPrompt.ERROR_LOCKOUT_PERMANENT,
        BiometricPrompt.ERROR_NO_BIOMETRICS,
        BiometricPrompt.ERROR_HW_NOT_PRESENT,
        BiometricPrompt.ERROR_HW_UNAVAILABLE -> E_UNAVAILABLE
        else -> E_FAILED
      }

  companion object {
    const val NAME = "AdenaBiometricVault"
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val KEY_SIZE_BITS = 256
    private const val IV_LENGTH = 12
    private const val TAG_LENGTH_BITS = 128
    private const val E_CANCELED = "E_CANCELED"
    private const val E_UNAVAILABLE = "E_UNAVAILABLE"
    private const val E_KEY_INVALIDATED = "E_KEY_INVALIDATED"
    private const val E_FAILED = "E_FAILED"
  }
}
