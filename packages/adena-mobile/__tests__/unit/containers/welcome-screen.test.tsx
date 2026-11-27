import { act, fireEvent, screen } from '@testing-library/react-native';

import { WelcomeScreen } from '../../../src/containers/onboarding/welcome-screen';
import { isValidMnemonic } from '../../../src/crypto/mnemonic';
import { useOnboardingStore } from '../../../src/stores/onboarding.store';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';
import { createTestContainer, TEST_PASSWORD } from '../../helpers/test-container';

describe('WelcomeScreen', () => {
  beforeEach(resetStores);
  // Lets the cloud backup queries settle inside act.
  const settle = (): Promise<void> => act(() => new Promise<void>(resolve => setTimeout(resolve, 0)));

  afterEach(settle);

  it('generates a fresh mnemonic before choosing a backup method', async () => {
    const { navigation } = await renderScreen(WelcomeScreen);

    await settle();
    await fireEvent.press(screen.getByRole('button', { name: 'Create a wallet' }));

    expect(isValidMnemonic(useOnboardingStore.getState().mnemonic ?? '')).toBe(true);
    expect(navigation.navigate).toHaveBeenCalledWith('BackupMethod');
  });

  // A fresh install may not see iCloud's file list yet, so the import chooser offers it whenever iCloud is available.
  it('opens the import chooser when iCloud is available and clears a pending mnemonic', async () => {
    useOnboardingStore.setState({ mnemonic: 'stale words' });
    const { navigation } = await renderScreen(WelcomeScreen);

    await settle();
    await fireEvent.press(screen.getByRole('button', { name: 'Import a wallet' }));

    expect(useOnboardingStore.getState().mnemonic).toBeNull();
    expect(navigation.navigate).toHaveBeenCalledWith('ImportMethod');
  });

  it('goes straight to the phrase without a usable cloud', async () => {
    const env = createTestContainer({ cloudBackup: { available: false } });
    const { navigation } = await renderScreen(WelcomeScreen, { env });

    await settle();
    await fireEvent.press(screen.getByRole('button', { name: 'Import a wallet' }));

    expect(navigation.navigate).toHaveBeenCalledWith('ImportWallet');
  });

  it('skips the chooser for Google Drive without a backup, and opens it once Drive holds one', async () => {
    const empty = createTestContainer({ cloudBackup: { provider: 'google-drive' } });
    const first = await renderScreen(WelcomeScreen, { env: empty });

    await settle();
    await fireEvent.press(screen.getByRole('button', { name: 'Import a wallet' }));
    expect(first.navigation.navigate).toHaveBeenCalledWith('ImportWallet');
    await first.unmount();

    const source = await setupWallet(createTestContainer({ cloudBackup: { provider: 'google-drive' } }));

    await source.env.container.cloudBackupService.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: 'violet orbit lantern 42', confirmPassword: 'violet orbit lantern 42' });
    const env = createTestContainer({ cloudBackup: { provider: 'google-drive', files: source.env.cloudBackupStore.files } });
    const second = await renderScreen(WelcomeScreen, { env });

    await settle();
    await settle();
    await fireEvent.press(screen.getByRole('button', { name: 'Import a wallet' }));
    expect(second.navigation.navigate).toHaveBeenCalledWith('ImportMethod');
  });

  it('opens the chooser for Google Drive before access is granted without asking for it', async () => {
    const env = createTestContainer({ cloudBackup: { provider: 'google-drive', requiresSignIn: true } });
    const { navigation } = await renderScreen(WelcomeScreen, { env });

    await settle();
    await settle();
    await fireEvent.press(screen.getByRole('button', { name: 'Import a wallet' }));
    expect(navigation.navigate).toHaveBeenCalledWith('ImportMethod');
    expect(env.cloudBackupStore.signInCalls).toBe(0);
  });
});
