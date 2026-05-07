import { AlarmKey } from '@common/constants/alarm-key.constant';

const STORAGE_KEY = 'ADENA_DATA';
const DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES = 5;

// Broadcast type used by background to notify any open UI surface that the
// auto-lock alarm just fired. The UI reacts by invalidating the cached
// `wallet/locked` query so the lock screen renders immediately, instead of
// waiting for the next user interaction to trigger a refetch.
export const AUTO_LOCK_TRIGGERED_MESSAGE = 'AUTO_LOCK_TRIGGERED';

export interface AutoLockTriggeredMessage {
  type: typeof AUTO_LOCK_TRIGGERED_MESSAGE;
}

export const isAutoLockTriggeredMessage = (
  message: unknown,
): message is AutoLockTriggeredMessage => {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === AUTO_LOCK_TRIGGERED_MESSAGE
  );
};

/**
 * Read the user-configured auto-lock duration from chrome.storage.local.
 *
 * Bypasses the StorageManager / ChromeLocalStorage abstraction on purpose:
 * those go through the storage migrator on every access, which is
 * heavyweight for a hot path that fires on every UI activity ping in the
 * background service worker. We only need a single key lookup here, so a
 * raw read against the ADENA_DATA blob is the right tradeoff.
 *
 * Returns DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES when the value is missing or unparsable.
 * Returns 0 when the user has explicitly disabled auto-lock.
 */
export async function readAutoLockMinutes(): Promise<number> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const raw = result?.[STORAGE_KEY];
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const value = parsed?.data?.AUTO_LOCK_TIMEOUT_MINUTES;
    if (value === null || value === undefined || value === '') {
      return DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES;
    }
    const minutes = Number(value);
    if (!Number.isFinite(minutes) || minutes < 0) {
      return DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES;
    }
    return minutes;
  } catch {
    return DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES;
  }
}

/**
 * Wallet is considered unlocked when both encrypted password fragments
 * exist in chrome.storage.session.
 */
export async function isWalletUnlocked(): Promise<boolean> {
  try {
    const session = await chrome.storage.session.get(['ENCRYPTED_KEY', 'ENCRYPTED_PASSWORD']);
    return !!session.ENCRYPTED_KEY && !!session.ENCRYPTED_PASSWORD;
  } catch {
    return false;
  }
}

/**
 * Replace any pending auto-lock alarm with a fresh one matching the user's
 * configured duration. Skips creation when the wallet is locked or the
 * duration is zero (auto-lock disabled).
 *
 * chrome.alarms persists across service worker restarts and laptop sleep,
 * so a single one-shot alarm is enough — no in-memory bookkeeping needed.
 */
export async function resetAutoLockAlarm(): Promise<void> {
  await chrome.alarms.clear(AlarmKey.AUTO_LOCK_TIMER);
  if (!(await isWalletUnlocked())) {
    return;
  }
  const minutes = await readAutoLockMinutes();
  if (minutes <= 0) {
    return;
  }
  // Chrome enforces a 1-minute floor on delayInMinutes in production builds.
  const delayInMinutes = Math.max(minutes, 1);
  chrome.alarms.create(AlarmKey.AUTO_LOCK_TIMER, { delayInMinutes });
}

export async function clearAutoLockAlarm(): Promise<void> {
  await chrome.alarms.clear(AlarmKey.AUTO_LOCK_TIMER);
}
