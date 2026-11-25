package com.adena.clipboard

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Fired by the expiry alarm, also when the app process was killed after the copy. */
class SecureClipboardClearReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    SecureClipboardExpiry.clearIfExpired(context)
  }
}
