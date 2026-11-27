import { create } from 'zustand';

import { BackupContent } from '../security/backup-codec';

interface OnboardingState {
  // Kept in memory only for the few screens of the onboarding flow.
  mnemonic: string | null;
  // Decrypted cloud backup waiting for a new wallet password; dropped as soon as the flow ends.
  restoreBackup: BackupContent | null;
  // HD indexes picked on the import account list; null creates only the first account.
  hdIndexes: number[] | null;
  // Cloud backup password chosen before the wallet exists; the backup is written once it is created.
  backupPassword: string | null;
  // Biometric unlock picked on the protect step; turned on when the wallet is created.
  enableBiometrics: boolean;
  // The user already holds the phrase (wrote it down, or imported it); otherwise Home keeps asking for a backup.
  phraseSaved: boolean;
  setMnemonic: (mnemonic: string | null) => void;
  setRestoreBackup: (backup: BackupContent | null) => void;
  setHdIndexes: (hdIndexes: number[] | null) => void;
  setBackupPassword: (backupPassword: string | null) => void;
  setEnableBiometrics: (enableBiometrics: boolean) => void;
  setPhraseSaved: (phraseSaved: boolean) => void;
  clear: () => void;
}

const EMPTY = { mnemonic: null, restoreBackup: null, hdIndexes: null, backupPassword: null, enableBiometrics: false, phraseSaved: false };

export const useOnboardingStore = create<OnboardingState>(set => ({
  ...EMPTY,
  // A new phrase or backup starts a new flow, so the choices made for the previous one are dropped.
  setMnemonic: (mnemonic): void => set({ ...EMPTY, mnemonic }),
  setRestoreBackup: (restoreBackup): void => set({ ...EMPTY, restoreBackup }),
  setHdIndexes: (hdIndexes): void => set({ hdIndexes }),
  setBackupPassword: (backupPassword): void => set({ backupPassword }),
  setEnableBiometrics: (enableBiometrics): void => set({ enableBiometrics }),
  setPhraseSaved: (phraseSaved): void => set({ phraseSaved }),
  clear: (): void => set(EMPTY),
}));
