/**
 * Holds the secret being onboarded (a recovery phrase or a private key)
 * between screens, so it never goes into navigation params, which dev tools
 * log and navigation state keeps. Cleared as soon as it is used or onboarding
 * is abandoned.
 */
export type PendingSecret =
  | {kind: 'mnemonic'; value: string}
  | {kind: 'privateKey'; value: string};

let pending: PendingSecret | null = null;

export const pendingSecret = {
  set(secret: PendingSecret): void {
    pending = secret;
  },
  peekMnemonic(): string | null {
    return pending?.kind === 'mnemonic' ? pending.value : null;
  },
  consume(): PendingSecret | null {
    const value = pending;
    pending = null;
    return value;
  },
  clear(): void {
    pending = null;
  },
};
