import Clipboard from '@react-native-clipboard/clipboard';
import { useCallback, useEffect, useRef } from 'react';

import { useToastStore } from '../stores/toast.store';

export const SENSITIVE_CLIPBOARD_TTL_MS = 60_000;

export interface SensitiveClipboard {
  copy: (value: string, message: string) => void;
  // Empties the clipboard only if it still holds the copied secret.
  clear: () => Promise<void>;
}

export const useSensitiveClipboard = (ttlMs = SENSITIVE_CLIPBOARD_TTL_MS): SensitiveClipboard => {
  const showToast = useToastStore(state => state.show);
  const copiedRef = useRef<string | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clear = useCallback(async (): Promise<void> => {
    const copied = copiedRef.current;

    clearTimeout(timerRef.current);
    timerRef.current = undefined;
    copiedRef.current = undefined;

    if (copied === undefined) {
      return;
    }

    try {
      if (await Clipboard.getString() === copied) {
        Clipboard.setString('');
      }
    }
    catch {
      // Reading the clipboard can fail when the app is backgrounded; nothing else to do.
    }
  }, []);

  const copy = useCallback((value: string, message: string): void => {
    Clipboard.setString(value);
    showToast(message, 'success');
    clearTimeout(timerRef.current);
    copiedRef.current = value;
    timerRef.current = setTimeout(clear, ttlMs);
  }, [clear, showToast, ttlMs]);

  useEffect(() => (): void => clearTimeout(timerRef.current), []);

  return { copy, clear };
};
