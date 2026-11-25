import { create } from 'zustand';

import { Network } from '../domain/network';

export interface PendingBroadcast {
  accountId: string;
  network: Network;
  // `checking` is being polled; `unconfirmed` means polling gave up but the tx may still have committed.
  phase: 'checking' | 'unconfirmed';
  // Identifies one `checking` round; a new one starts on each send or recheck.
  round: number;
  // Last reconcile found it not on chain with its sequence still current, so a pinned replacement is safe.
  replaceable: boolean;
  // Hook instance that sent it (0 when restored from storage); only that screen runs its post-commit navigation.
  ownerId: number;
  // Record that owner sent; only its commit runs the navigation, others are reported by a toast.
  ownedRecordId?: string;
}

interface PendingBroadcastState {
  // Keyed by `pendingScope`.
  entries: Record<string, PendingBroadcast>;
  set: (scope: string, pending: PendingBroadcast | null) => void;
}

// Per account and chain id, matching PendingBroadcastRepository: networks on the same chain share it.
export const pendingScope = (accountId: string, chainId: string): string => `${accountId}:${chainId}`;

// Polling state shared by every send screen; the persisted PendingBroadcastRepository records are what block sending.
export const usePendingBroadcastStore = create<PendingBroadcastState>(set => ({
  entries: {},
  set: (scope, pending): void => set(({ entries }) => {
    const { [scope]: _removed, ...rest } = entries;

    return { entries: pending ? { ...rest, [scope]: pending } : rest };
  }),
}));
