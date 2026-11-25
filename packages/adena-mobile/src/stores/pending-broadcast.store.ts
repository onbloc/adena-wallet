import { create } from 'zustand';

import { Network } from '../domain/network';

export interface PendingBroadcast {
  hash: string;
  accountId: string;
  network: Network;
  // `checking` is being polled; `unconfirmed` means polling gave up but the tx may still have committed.
  phase: 'checking' | 'unconfirmed';
  // Hook instance that sent it (0 when restored from storage); only that screen runs its post-commit navigation.
  ownerId: number;
}

interface PendingBroadcastState {
  // Keyed by `pendingScope`.
  entries: Record<string, PendingBroadcast>;
  set: (scope: string, pending: PendingBroadcast | null) => void;
}

export const pendingScope = (accountId: string, networkId: string): string => `${accountId}:${networkId}`;

// Polling state shared by every send screen; the persisted PendingBroadcastRepository record is what blocks sending.
export const usePendingBroadcastStore = create<PendingBroadcastState>(set => ({
  entries: {},
  set: (scope, pending): void => set(({ entries }) => {
    const { [scope]: _removed, ...rest } = entries;

    return { entries: pending ? { ...rest, [scope]: pending } : rest };
  }),
}));
