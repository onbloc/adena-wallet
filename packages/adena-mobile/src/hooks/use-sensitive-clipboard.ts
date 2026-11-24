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
  copiedAt: number;
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

// The clipboard reads as '' while backgrounded (Android 10+, iOS), so a hidden app wipes it
// unconditionally inside the TTL window and verifies once it is active again.
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

    const wiped = Date.now() - copied.copiedAt < ttlMs && wipeClipboard();

    if (appStateRef.current !== 'active') {
      // Keep the secret so the next `active` can confirm the wipe.
      return;
    }

    if (!wiped) {
      await wipeIfStillCopied(copied.value);
    }

    forget();
  }, [forget, ttlMs]);

  const expire = useCallback(async (): Promise<void> => {
    const copied = copiedRef.current;

    if (copied === undefined) {
      return;
    }

    timerRef.current = undefined;

    if (appStateRef.current !== 'active') {
      wipeClipboard();
      return;
    }

    await wipeIfStillCopied(copied.value);
    forget();
  }, [forget]);

  const copy = useCallback((value: string, message: string): void => {
    Clipboard.setString(value);
    showToast(message, 'success');
    clearTimeout(timerRef.current);
    copiedRef.current = { value, copiedAt: Date.now() };
    timerRef.current = setTimeout(expire, ttlMs);
  }, [expire, showToast, ttlMs]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      appStateRef.current = state;

      const copied = copiedRef.current;

      if (state === 'background') {
        clear();
      }
      else if (state === 'active' && copied !== undefined && timerRef.current === undefined) {
        wipeIfStillCopied(copied.value).then(() => {
          if (copiedRef.current === copied) {
            forget();
          }
        });
      }
    });

    return (): void => {
      subscription.remove();

      if (copiedRef.current !== undefined && Date.now() - copiedRef.current.copiedAt < ttlMs) {
        wipeClipboard();
      }

      forget();
    };
  }, [clear, forget, ttlMs]);

  return { copy, clear };
};
