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

const wipeIfStillCopied = async (value: string): Promise<void> => {
  try {
    if (await Clipboard.getString() === value) {
      Clipboard.setString('');
    }
  }
  catch {
    // Nothing more to do when the clipboard cannot be read.
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
  }, []);

  const clear = useCallback(async (): Promise<void> => {
    const copied = copiedRef.current;

    if (copied === undefined) {
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = undefined;

    const wiped = Date.now() < copied.expiresAt && wipeClipboard();

    if (appStateRef.current !== 'active') {
      // Keep the secret so the next `active` can confirm the wipe.
      return;
    }

    if (!wiped) {
      await wipeIfStillCopied(copied.value);
    }

    forget();
  }, [forget]);

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

    await wipeIfStillCopied(copied.value);
    forget();
  }, [forget]);

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
        wipeIfStillCopied(copied.value).then(() => {
          if (copiedRef.current === copied) {
            forget();
          }
        });
      }
    });

    return (): void => subscription.remove();
  }, [forget]);

  // Unmount only (no deps), so effect re-runs never wipe a secret the user is still pasting.
  useEffect(() => (): void => {
    if (copiedRef.current !== undefined && Date.now() < copiedRef.current.expiresAt) {
      wipeClipboard();
    }

    clearTimeout(timerRef.current);
    copiedRef.current = undefined;
  }, []);

  return { copy, clear, outlivesBackground: Boolean(NativeAdenaSecureClipboard) };
};
