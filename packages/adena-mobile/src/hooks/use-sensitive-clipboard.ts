import Clipboard from '@react-native-clipboard/clipboard';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { useToastStore } from '../stores/toast.store';

export const SENSITIVE_CLIPBOARD_TTL_MS = 60_000;

export interface SensitiveClipboard {
  copy: (value: string, message: string) => void;
  // Wipes the copied secret; while the app is not active the wipe is re-checked on the next `active`.
  clear: () => Promise<void>;
}

interface CopiedSecret {
  value: string;
  expiresAt: number;
}

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

// Backgrounding keeps the secret for the TTL so it can be pasted elsewhere; the clipboard reads as ''
// while backgrounded (Android 10+, iOS), so an expiry missed there is checked on the next `active`.
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
    Clipboard.setString(value);
    showToast(message, 'success');
    clearTimeout(timerRef.current);
    copiedRef.current = { value, expiresAt: Date.now() + ttlMs };
    timerRef.current = setTimeout(expire, ttlMs);
  }, [expire, showToast, ttlMs]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      appStateRef.current = state;

      const copied = copiedRef.current;

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

  return { copy, clear };
};
