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

  it('keeps either a phrase or a decrypted backup, never both', () => {
    const backup = { version: 1, backupId: 'a'.repeat(32), createdAt: 1, keyrings: [] } as never;

    useOnboardingStore.getState().setMnemonic('x');
    useOnboardingStore.getState().setRestoreBackup(backup);
    expect(useOnboardingStore.getState()).toMatchObject({ mnemonic: null, restoreBackup: backup });
    useOnboardingStore.getState().setMnemonic('y');
    expect(useOnboardingStore.getState().restoreBackup).toBeNull();
    useOnboardingStore.getState().setRestoreBackup(backup);
    useOnboardingStore.getState().clear();
    expect(useOnboardingStore.getState()).toMatchObject({ mnemonic: null, restoreBackup: null });
  });
});
