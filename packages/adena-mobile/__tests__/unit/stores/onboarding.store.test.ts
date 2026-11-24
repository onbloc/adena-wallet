import { useOnboardingStore } from '../../../src/stores/onboarding.store';

describe('useOnboardingStore', () => {
  it('sets and clears the mnemonic', () => {
    expect(useOnboardingStore.getState().mnemonic).toBeNull();
    useOnboardingStore.getState().setMnemonic('abandon about');
    expect(useOnboardingStore.getState().mnemonic).toBe('abandon about');
    useOnboardingStore.getState().setMnemonic(null);
    expect(useOnboardingStore.getState().mnemonic).toBeNull();
    useOnboardingStore.getState().setMnemonic('x');
    useOnboardingStore.getState().clear();
    expect(useOnboardingStore.getState().mnemonic).toBeNull();
  });
});
