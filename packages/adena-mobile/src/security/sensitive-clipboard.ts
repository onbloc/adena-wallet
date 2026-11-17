import Clipboard from '@react-native-clipboard/clipboard';

import {copySensitive} from './native-security';

export const CLIPBOARD_CLEAR_MS = 60_000;

let clearTimer: ReturnType<typeof setTimeout> | null = null;

/** The extension clears a copied seed phrase sooner (web-copy-button). */
export const SECRET_CLIPBOARD_CLEAR_MS = 30_000;

/** Copies a seed phrase or key; see copySensitive for how it is cleared. */
export function copySecret(value: string): void {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
  copySensitive(value, SECRET_CLIPBOARD_CLEAR_MS);
}

/**
 * Copies a value and clears the clipboard after `clearMs`, but only if it
 * still holds that value (the user may have copied something else since).
 */
export function copyWithExpiry(
  value: string,
  clearMs: number = CLIPBOARD_CLEAR_MS,
): void {
  Clipboard.setString(value);
  if (clearTimer) {
    clearTimeout(clearTimer);
  }
  clearTimer = setTimeout(async () => {
    clearTimer = null;
    if ((await Clipboard.getString()) === value) {
      Clipboard.setString('');
    }
  }, clearMs);
}
