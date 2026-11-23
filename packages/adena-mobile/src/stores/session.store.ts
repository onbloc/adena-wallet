import { create } from 'zustand';

import { WalletStatus } from '../services/wallet.service';

export const SessionStatus = {
  BOOTING: 'booting',
  ...WalletStatus,
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

interface SessionState {
  status: SessionStatus;
  // Bumped whenever accounts/networks change so selectors re-read services.
  revision: number;
  setStatus: (status: SessionStatus) => void;
  bumpRevision: () => void;
}

// Client-only global UI state. Secrets never live in stores.
export const useSessionStore = create<SessionState>(set => ({
  status: SessionStatus.BOOTING,
  revision: 0,
  setStatus: (status): void => set({ status }),
  bumpRevision: (): void => set(state => ({ revision: state.revision + 1 })),
}));
