import { create } from 'zustand';

import { Network } from '../domain/network';

export interface PendingBroadcast {
  hash: string;
  network: Network;
  // `checking` is being polled; `unconfirmed` means polling gave up but the tx may still have committed.
  phase: 'checking' | 'unconfirmed';
  // Hook instance that sent it; only that screen runs its post-commit navigation.
  ownerId: number;
}

interface PendingBroadcastState {
  pending: PendingBroadcast | null;
  set: (pending: PendingBroadcast | null) => void;
}

// In-memory only: shared by every send screen and kept across navigation, cleared on app restart.
export const usePendingBroadcastStore = create<PendingBroadcastState>(set => ({
  pending: null,
  set: (pending): void => set({ pending }),
}));
