import { AdenaWallet } from 'adena-module';

// Single-shot in-memory handoff for an unencrypted wallet between an onboarding
// entry flow and the create-password screen. The wallet is never serialized to
// history.state, storage, or any other channel that survives in heap snapshots
// or DevTools introspection. On consume/clear/overwrite, the wallet's keyring
// buffers are zeroized via AdenaWallet.destroy() (sodium.memzero).

let pending: AdenaWallet | null = null;

export const pendingWalletStore = {
  set(wallet: AdenaWallet): void {
    if (pending) {
      pending.destroy();
    }
    pending = wallet;
  },
  consume(): AdenaWallet | null {
    const current = pending;
    pending = null;
    return current;
  },
  clear(): void {
    if (pending) {
      pending.destroy();
      pending = null;
    }
  },
  has(): boolean {
    return pending !== null;
  },
};
