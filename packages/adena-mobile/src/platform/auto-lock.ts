import {AppState, AppStateStatus} from 'react-native';

/**
 * The extension lets users turn auto-lock off (0 minutes). A phone is lost or
 * handed over far more often than a laptop, so on mobile 0 and anything above
 * this cap mean "lock after MAX_MINUTES".
 */
export const MAX_AUTO_LOCK_MINUTES = 15;

export interface AutoLockOptions {
  /** The user's setting, read from the same storage key as the extension. */
  readMinutes: () => Promise<number>;
  lock: () => Promise<void>;
  isUnlocked: () => Promise<boolean>;
  now?: () => number;
}

export const effectiveAutoLockMinutes = (minutes: number): number =>
  !Number.isFinite(minutes) || minutes <= 0
    ? MAX_AUTO_LOCK_MINUTES
    : Math.min(minutes, MAX_AUTO_LOCK_MINUTES);

/**
 * Locks after the configured idle time in the foreground, and on return from
 * the background when that much wall-clock time has passed. A clock that moved
 * backwards while the app was away also locks, so changing the device time
 * cannot extend a session.
 */
export class AutoLock {
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  private backgroundedAt: number | null = null;

  private subscription: {remove(): void} | null = null;

  private readonly now: () => number;

  constructor(private readonly options: AutoLockOptions) {
    this.now = options.now ?? Date.now;
  }

  start(): void {
    this.subscription?.remove();
    this.subscription = AppState.addEventListener(
      'change',
      this.onAppStateChange,
    );
  }

  stop(): void {
    this.subscription?.remove();
    this.subscription = null;
    this.clearIdleTimer();
    this.backgroundedAt = null;
  }

  /** Restarts the foreground idle timer; called on user activity and when the setting changes. */
  async reset(): Promise<void> {
    this.clearIdleTimer();
    if (!(await this.options.isUnlocked())) {
      return;
    }
    const minutes = effectiveAutoLockMinutes(await this.options.readMinutes());
    this.idleTimer = setTimeout(() => {
      this.options.lock().catch(() => undefined);
    }, minutes * 60_000);
  }

  private onAppStateChange = async (state: AppStateStatus): Promise<void> => {
    if (state === 'background') {
      this.backgroundedAt = this.now();
      return;
    }
    if (state !== 'active' || this.backgroundedAt === null) {
      return;
    }

    const backgroundedAt = this.backgroundedAt;
    this.backgroundedAt = null;
    const elapsed = this.now() - backgroundedAt;
    const limit =
      effectiveAutoLockMinutes(await this.options.readMinutes()) * 60_000;

    if (elapsed < 0 || elapsed >= limit) {
      await this.options.lock();
      return;
    }
    await this.reset();
  };

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}
