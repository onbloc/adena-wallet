import Clipboard from '@react-native-clipboard/clipboard';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import NativeAdenaSecureClipboard from '../native/NativeAdenaSecureClipboard';
import { useToastStore } from '../stores/toast.store';

export const SENSITIVE_CLIPBOARD_TTL_MS = 60_000;

export interface SensitiveClipboard {
  copy: (value: string, message: string) => void;
  // False when nothing can clear the secret while the app is backgrounded, so it is wiped on leaving.
  outlivesBackground: boolean;
  // Wipes the copied secret; while the app is not active the wipe is re-checked on the next `active`.
  clear: () => Promise<void>;
}

interface CopiedSecret {
  value: string;
  expiresAt: number;
  expiresNatively: boolean;
}

// The native copy expires on its own, also while backgrounded; the plain clipboard is the fallback.
const writeSecret = (value: string, ttlMs: number): boolean => {
  if (NativeAdenaSecureClipboard) {
    try {
      NativeAdenaSecureClipboard.setSensitiveString(value, ttlMs);
      return true;
    }
    catch {
      // Falls back to the plain clipboard below.
    }
  }

  Clipboard.setString(value);
  return false;
};

const wipeClipboard = (): boolean => {
  try {
    Clipboard.setString('');
    return true;
  }
  catch {
    return false;
  }
};

// Stops the native expiry from firing later; a missing or failing module never blocks the wipe.
const cancelNativeExpiry = (): void => {
  try {
    NativeAdenaSecureClipboard?.cancelExpiry();
  }
  catch {
    // The native expiry only clears a clip that still matches the secret.
  }
};

// `unknown`: the clip could not be read (Android 10+ without input focus reads ''), so ownership is open.
type WipeOutcome = 'wiped' | 'replaced' | 'unknown';

const wipeIfStillCopied = async (value: string): Promise<WipeOutcome> => {
  try {
    const current = await Clipboard.getString();

    if (current === value) {
      Clipboard.setString('');
      return 'wiped';
    }

    return current ? 'replaced' : 'unknown';
  }
  catch {
    return 'unknown';
  }
};

// The TTL can be enforced in the background only when the platform expires the copy itself; otherwise
// the secret is wiped once the app is backgrounded. An expiry missed there is checked on the next `active`.
export const useSensitiveClipboard = (ttlMs = SENSITIVE_CLIPBOARD_TTL_MS): SensitiveClipboard => {
  const showToast = useToastStore(state => state.show);
  const copiedRef = useRef<CopiedSecret | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const appStateRef = useRef<AppStateStatus>('active');

  const forget = useCallback((): void => {
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
    copiedRef.current = undefined;
    cancelNativeExpiry();
  }, []);

  // An unverified wipe keeps a retry: the native expiry rechecks on focus, the JS copy on the next `active`.
  const settle = useCallback((copied: CopiedSecret, outcome: WipeOutcome): void => {
    if (copiedRef.current !== copied) {
      return;
    }

    if (outcome !== 'unknown') {
      forget();
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = undefined;

    if (copied.expiresNatively) {
      copiedRef.current = undefined;
    }
  }, [forget]);

  const clear = useCallback(async (): Promise<void> => {
    const copied = copiedRef.current;

    if (copied === undefined) {
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = undefined;

    const wiped = Date.now() < copied.expiresAt && wipeClipboard();

    if (wiped) {
      cancelNativeExpiry();
    }

    if (appStateRef.current !== 'active') {
      // Keep the secret so the next `active` can confirm the wipe.
      return;
    }

    if (wiped) {
      forget();
      return;
    }

    settle(copied, await wipeIfStillCopied(copied.value));
  }, [forget, settle]);

  const expire = useCallback(async (): Promise<void> => {
    const copied = copiedRef.current;

    if (copied === undefined) {
      return;
    }

    timerRef.current = undefined;

    if (appStateRef.current !== 'active') {
      // Verified on the next `active`; the native sensitive copy also expires on its own.
      return;
    }

    settle(copied, await wipeIfStillCopied(copied.value));
  }, [settle]);

  const copy = useCallback((value: string, message: string): void => {
    const expiresNatively = writeSecret(value, ttlMs);

    showToast(message, 'success');
    clearTimeout(timerRef.current);
    copiedRef.current = { value, expiresAt: Date.now() + ttlMs, expiresNatively };
    timerRef.current = setTimeout(expire, ttlMs);
  }, [expire, showToast, ttlMs]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      appStateRef.current = state;

      const copied = copiedRef.current;

      // Nothing would clear it at the deadline while backgrounded, so it goes now (writes are allowed there).
      // A secret still tracked here was never confirmed wiped, even past its deadline.
      if (state === 'background' && copied !== undefined && !copied.expiresNatively) {
        wipeClipboard();
        forget();
        return;
      }

      if (state === 'active' && copied !== undefined && timerRef.current === undefined) {
        wipeIfStillCopied(copied.value).then(outcome => settle(copied, outcome));
      }
    });

    return (): void => subscription.remove();
  }, [forget, settle]);

  // Unmount only (no deps), so effect re-runs never wipe a secret the user is still pasting.
  useEffect(() => (): void => {
    if (copiedRef.current !== undefined && Date.now() < copiedRef.current.expiresAt) {
      if (wipeClipboard()) {
        cancelNativeExpiry();
      }
    }

    clearTimeout(timerRef.current);
    copiedRef.current = undefined;
  }, []);

  return { copy, clear, outlivesBackground: Boolean(NativeAdenaSecureClipboard) };
};
