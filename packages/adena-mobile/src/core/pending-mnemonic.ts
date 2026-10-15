/**
 * Holds the recovery phrase between the onboarding screens (show → confirm →
 * set password) so it never goes into navigation params, which are logged by
 * dev tools and kept in navigation state. Cleared as soon as it is used or
 * onboarding is abandoned.
 */
let pending: string | null = null;

export const pendingMnemonic = {
  set(mnemonic: string): void {
    pending = mnemonic;
  },
  peek(): string | null {
    return pending;
  },
  consume(): string | null {
    const value = pending;
    pending = null;
    return value;
  },
  clear(): void {
    pending = null;
  },
};
