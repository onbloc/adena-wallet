import { create } from 'zustand';

import { BackupContent } from '../security/backup-codec';

interface OnboardingState {
  // Kept in memory only for the few screens of the onboarding flow.
  mnemonic: string | null;
  // Decrypted cloud backup waiting for a new wallet password; dropped as soon as the flow ends.
  restoreBackup: BackupContent | null;
  setMnemonic: (mnemonic: string | null) => void;
  setRestoreBackup: (backup: BackupContent | null) => void;
  clear: () => void;
}

export const useOnboardingStore = create<OnboardingState>(set => ({
  mnemonic: null,
  restoreBackup: null,
  setMnemonic: (mnemonic): void => set({ mnemonic, restoreBackup: null }),
  setRestoreBackup: (restoreBackup): void => set({ restoreBackup, mnemonic: null }),
  clear: (): void => set({ mnemonic: null, restoreBackup: null }),
}));
