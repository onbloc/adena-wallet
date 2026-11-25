import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { APP_CONFIG } from '../config/app';
import { SessionStatus, useSessionStore } from '../stores/session.store';
import { shouldAutoLock } from './auto-lock-policy';
import { useLockWallet } from './use-lock-wallet';

const IDLE_CHECK_INTERVAL_MS = 15 * 1000;

// Locks after the auto-lock window without touches, or after that long in the background.
// Returns the handler the root view calls on every touch.
export const useAutoLock = (): (() => void) => {
  const lockWallet = useLockWallet();
  const status = useSessionStore(state => state.status);
  const lastActiveAtRef = useRef(0);
  const backgroundedAtRef = useRef<number | null>(null);

  const lockIfExpired = useCallback((...since: number[]) => {
    const now = Date.now();

    if (useSessionStore.getState().status === SessionStatus.UNLOCKED && since.some(at => shouldAutoLock(at, now, APP_CONFIG.autoLockMs))) {
      lockWallet();
    }
  }, [lockWallet]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundedAtRef.current = Date.now();
        return;
      }

      if (state === 'active' && backgroundedAtRef.current !== null) {
        const backgroundedAt = backgroundedAtRef.current;

        backgroundedAtRef.current = null;
        // Returning is not a touch: the idle time before backgrounding still counts.
        lockIfExpired(backgroundedAt, lastActiveAtRef.current);
      }
    });

    return (): void => subscription.remove();
  }, [lockIfExpired]);

  // JS timers pause in the background; the AppState check above covers that period.
  useEffect(() => {
    if (status !== SessionStatus.UNLOCKED) {
      return;
    }

    lastActiveAtRef.current = Date.now();
    const timer = setInterval(() => lockIfExpired(lastActiveAtRef.current), IDLE_CHECK_INTERVAL_MS);

    return (): void => clearInterval(timer);
  }, [lockIfExpired, status]);

  return useCallback(() => {
    lastActiveAtRef.current = Date.now();
  }, []);
};
