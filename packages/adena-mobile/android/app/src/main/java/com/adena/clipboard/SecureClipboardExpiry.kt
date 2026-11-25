package com.adena.clipboard

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.provider.Settings
import java.security.MessageDigest

/**
 * Persists the deadline of a copied secret (only its SHA-256, never the text) so it is enforced
 * by an alarm and by the next app start even after the process dies.
 */
internal object SecureClipboardExpiry {

  private const val PREFS = "adena_secure_clipboard"
  private const val KEY_HASH = "hash"
  private const val KEY_ELAPSED_DEADLINE = "elapsed_deadline"
  private const val KEY_WALL_DEADLINE = "wall_deadline"
  private const val KEY_BOOT_COUNT = "boot_count"
  private const val ACTION_CLEAR = "com.adena.clipboard.action.CLEAR_EXPIRED"

  /** Records the deadline of a new copy, replacing any earlier one, and arms the expiry alarm. */
  fun arm(context: Context, value: String, delayMs: Long) {
    cancelAlarm(context)
    val elapsedDeadline = SystemClock.elapsedRealtime() + delayMs
    // commit(): the marker must be on disk before the secret reaches the clipboard.
    prefs(context).edit()
        .putString(KEY_HASH, sha256(value))
        .putLong(KEY_ELAPSED_DEADLINE, elapsedDeadline)
        .putLong(KEY_WALL_DEADLINE, System.currentTimeMillis() + delayMs)
        .putInt(KEY_BOOT_COUNT, bootCount(context))
        .commit()
    // Inexact allow-while-idle needs no exact-alarm permission; it may fire somewhat late.
    runCatching {
      alarmManager(context)?.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME, elapsedDeadline, clearIntent(context))
    }
  }

  /** Milliseconds until the recorded deadline, or null when no copy is pending. */
  fun remainingMs(context: Context): Long? {
    val prefs = prefs(context)
    if (!prefs.contains(KEY_HASH)) return null
    return (prefs.getLong(KEY_ELAPSED_DEADLINE, 0L) - SystemClock.elapsedRealtime()).coerceAtLeast(0L)
  }

  /**
   * Once the deadline passed, clears the clip only if it still holds the copied secret. Returns false while the
   * clip cannot be inspected: Android 10+ hides it (and its description) from apps without window focus, so the
   * marker stays and the next focused check decides. [focused]: the caller's window has focus.
   */
  fun clearIfExpired(context: Context, focused: Boolean): Boolean {
    val prefs = prefs(context)
    val hash = prefs.getString(KEY_HASH, null) ?: return false
    if (!isExpired(context)) return false

    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
    if (clipboard != null) {
      val clip = runCatching { clipboard.primaryClip }.getOrNull()
      // A null clip is only known to be empty where reading is allowed.
      if (clip == null && !focused && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) return false
      val current = clip?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.text?.toString()
      if (current != null && sha256(current) == hash) {
        clear(clipboard)
      }
    }
    forget(context)
    return true
  }

  /** Drops the marker and the alarm without touching the clipboard. */
  fun cancel(context: Context) = forget(context)

  private fun isExpired(context: Context): Boolean {
    val prefs = prefs(context)
    val savedBoot = prefs.getInt(KEY_BOOT_COUNT, -1)
    val currentBoot = bootCount(context)
    val rebooted = savedBoot != -1 && currentBoot != -1 && savedBoot != currentBoot
    return rebooted ||
        SystemClock.elapsedRealtime() >= prefs.getLong(KEY_ELAPSED_DEADLINE, 0L) ||
        System.currentTimeMillis() >= prefs.getLong(KEY_WALL_DEADLINE, 0L)
  }

  private fun forget(context: Context) {
    cancelAlarm(context)
    prefs(context).edit().clear().commit()
  }

  private fun cancelAlarm(context: Context) {
    runCatching { alarmManager(context)?.cancel(clearIntent(context)) }
  }

  private fun clear(clipboard: ClipboardManager) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      clipboard.clearPrimaryClip()
    } else {
      clipboard.setPrimaryClip(ClipData.newPlainText("", ""))
    }
  }

  private fun clearIntent(context: Context): PendingIntent =
      PendingIntent.getBroadcast(
          context,
          0,
          Intent(context, SecureClipboardClearReceiver::class.java).setAction(ACTION_CLEAR),
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )

  private fun alarmManager(context: Context): AlarmManager? =
      context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager

  private fun bootCount(context: Context): Int =
      runCatching { Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT) }.getOrDefault(-1)

  private fun prefs(context: Context) =
      context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun sha256(value: String): String =
      MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8))
          .joinToString("") { "%02x".format(it) }
}
