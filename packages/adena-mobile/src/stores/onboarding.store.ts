import { create } from 'zustand';

interface OnboardingState {
  // Kept in memory only for the few screens of the onboarding flow.
  mnemonic: string | null;
  setMnemonic: (mnemonic: string | null) => void;
  clear: () => void;
}

export const useOnboardingStore = create<OnboardingState>(set => ({
  mnemonic: null,
  setMnemonic: (mnemonic): void => set({ mnemonic }),
  clear: (): void => set({ mnemonic: null }),
}));
