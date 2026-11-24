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

  it('generates a fresh mnemonic before showing the backup phrase', async () => {
    const { navigation } = await renderScreen(WelcomeScreen);

    await settle();
    await fireEvent.press(screen.getByRole('button', { name: 'Create a new wallet' }));

    expect(isValidMnemonic(useOnboardingStore.getState().mnemonic ?? '')).toBe(true);
    expect(navigation.navigate).toHaveBeenCalledWith('BackupPhrase');
  });

  it('clears any pending mnemonic when importing', async () => {
    useOnboardingStore.setState({ mnemonic: 'stale words' });
    const { navigation } = await renderScreen(WelcomeScreen);

    await fireEvent.press(screen.getByRole('button', { name: 'Import with recovery phrase' }));

    expect(useOnboardingStore.getState().mnemonic).toBeNull();
    expect(navigation.navigate).toHaveBeenCalledWith('ImportWallet');
  });

  // A fresh install may not see iCloud's file list yet, so the restore page does the search (and can check again).
  it('offers an iCloud restore whenever iCloud is available', async () => {
    useOnboardingStore.setState({ mnemonic: 'stale words' });
    const { navigation } = await renderScreen(WelcomeScreen);

    await fireEvent.press(await screen.findByRole('button', { name: 'Restore from iCloud' }));
    expect(navigation.navigate).toHaveBeenCalledWith('RestoreBackup');
    expect(useOnboardingStore.getState().mnemonic).toBeNull();
  });

  it('offers a Google Drive restore only when Drive holds a backup once access is granted', async () => {
    const empty = createTestContainer({ cloudBackup: { provider: 'google-drive' } });
    const first = await renderScreen(WelcomeScreen, { env: empty });

    await settle();
    expect(screen.queryByTestId('welcome-restore')).toBeNull();
    await first.unmount();

    const source = await setupWallet(createTestContainer({ cloudBackup: { provider: 'google-drive' } }));

    await source.env.container.cloudBackupService.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: 'violet orbit lantern 42', confirmPassword: 'violet orbit lantern 42' });
    const env = createTestContainer({ cloudBackup: { provider: 'google-drive', files: source.env.cloudBackupStore.files } });

    await renderScreen(WelcomeScreen, { env });
    expect(await screen.findByRole('button', { name: 'Restore from Google Drive' })).toBeTruthy();
  });

  it('hides the restore without a usable cloud', async () => {
    const env = createTestContainer({ cloudBackup: { available: false } });

    await renderScreen(WelcomeScreen, { env });
    await screen.findByRole('button', { name: 'Create a new wallet' });
    expect(screen.queryByTestId('welcome-restore')).toBeNull();
  });

  it('offers a Google Drive restore before access is granted', async () => {
    const env = createTestContainer({ cloudBackup: { provider: 'google-drive', requiresSignIn: true } });

    await renderScreen(WelcomeScreen, { env });
    expect(await screen.findByRole('button', { name: 'Restore from Google Drive' })).toBeTruthy();
    expect(env.cloudBackupStore.signInCalls).toBe(0);
  });
});
