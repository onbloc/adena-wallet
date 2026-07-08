import { AdenaWallet } from 'adena-module';

import { SessionMetadataV021 } from '@migrates/migrations/v021/storage-model-v021';

// Single-shot in-memory handoff for an unencrypted wallet between an onboarding
// entry flow and the create-password screen. The wallet is never serialized to
// history.state, storage, or any other channel that survives in heap snapshots
// or DevTools introspection. On consume/clear/overwrite, the wallet's keyring
// buffers are zeroized via AdenaWallet.destroy() (sodium.memzero).
//
// The optional postSave slot carries side-effect data that needs to be written
// only after walletService.saveWallet succeeds: used by the session-import
// bootstrap flow (fresh install + Import) to persist session metadata to
// SESSIONS storage atomically with the new wallet vault.

export interface PendingPostSave {
  sessions: Array<{
    sessionAddr: string;
    metadata: SessionMetadataV021;
  }>;
}

let pending: AdenaWallet | null = null;
let pendingPostSave: PendingPostSave | null = null;

export const pendingWalletStore = {
  set(wallet: AdenaWallet, postSave?: PendingPostSave): void {
    if (pending) {
      pending.destroy();
    }
    pending = wallet;
    pendingPostSave = postSave ?? null;
  },
  consume(): AdenaWallet | null {
    const current = pending;
    pending = null;
    return current;
  },
  consumePostSave(): PendingPostSave | null {
    const current = pendingPostSave;
    pendingPostSave = null;
    return current;
  },
  clear(): void {
    if (pending) {
      pending.destroy();
      pending = null;
    }
    pendingPostSave = null;
  },
  has(): boolean {
    return pending !== null;
  },
};
