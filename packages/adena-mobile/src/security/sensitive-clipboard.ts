import Clipboard from '@react-native-clipboard/clipboard';

export const CLIPBOARD_CLEAR_MS = 60_000;

let clearTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Copies a value and clears the clipboard after a minute, but only if it
 * still holds that value (the user may have copied something else since).
 * Mnemonics and private keys are never copied; there is no API for it here.
 */
export function copyWithExpiry(value: string): void {
  Clipboard.setString(value);
  if (clearTimer) {
    clearTimeout(clearTimer);
  }
  clearTimer = setTimeout(async () => {
    clearTimer = null;
    if ((await Clipboard.getString()) === value) {
      Clipboard.setString('');
    }
  }, CLIPBOARD_CLEAR_MS);
}
