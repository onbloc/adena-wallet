import { fireEvent, screen } from '@testing-library/react-native';

import { RestoreBackupScreen } from '../../../src/containers/onboarding/restore-backup-screen';
import { useOnboardingStore } from '../../../src/stores/onboarding.store';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from '../../helpers/test-container';

const BACKUP_PASSWORD = 'violet orbit lantern 42';

// A backup made on another device, copied into a fresh device's cloud store.
const createEnvWithBackup = async () => {
  const source = await setupWallet();

  await source.env.container.cloudBackupService.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: BACKUP_PASSWORD, confirmPassword: BACKUP_PASSWORD });
  const env = createTestContainer();

  source.env.cloudBackupStore.files.forEach((file, name) => env.cloudBackupStore.files.set(name, file));
  return env;
};

describe('RestoreBackupScreen', () => {
  beforeEach(resetStores);

  it('decrypts the backup and continues to the new wallet password', async () => {
    const env = await createEnvWithBackup();
    const { navigation } = await renderScreen(RestoreBackupScreen, { env });

    await fireEvent.changeText(await screen.findByTestId('restore-backup-password'), BACKUP_PASSWORD);
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    await screen.findByRole('button', { name: 'Continue' });
    expect(navigation.navigate).toHaveBeenCalledWith('CreatePassword');
    expect(useOnboardingStore.getState().restoreBackup?.keyrings[0]).toMatchObject({ mnemonic: TEST_MNEMONIC });
    expect(screen.getByTestId('restore-backup-password').props.value).toBe('');
  });

  it('rejects a wrong backup password', async () => {
    const env = await createEnvWithBackup();
    const { navigation } = await renderScreen(RestoreBackupScreen, { env });

    await fireEvent.changeText(await screen.findByTestId('restore-backup-password'), 'wrong password!');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Incorrect backup password.')).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(useOnboardingStore.getState().restoreBackup).toBeNull();
    await fireEvent.changeText(screen.getByTestId('restore-backup-password'), 'x');
    expect(screen.queryByText('Incorrect backup password.')).toBeNull();
  });

  it('reports a damaged file', async () => {
    const env = createTestContainer();

    env.cloudBackupStore.files.set(`adena-backup-${'1'.repeat(32)}.json`, { contents: 'garbage', modifiedAt: 1 });
    await renderScreen(RestoreBackupScreen, { env });
    await fireEvent.changeText(await screen.findByTestId('restore-backup-password'), BACKUP_PASSWORD);
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/This backup file is damaged/)).toBeTruthy();
  });

  it('lets the user choose between several backups', async () => {
    const env = await createEnvWithBackup();
    const [[name, file]] = [...env.cloudBackupStore.files];

    env.cloudBackupStore.files.set(name, { ...file, modifiedAt: new Date(2026, 0, 2, 3, 4).getTime() });
    env.cloudBackupStore.files.set(`adena-backup-${'2'.repeat(32)}.json`, { contents: 'garbage', modifiedAt: new Date(2026, 5, 1, 0, 0).getTime() });
    const { navigation } = await renderScreen(RestoreBackupScreen, { env });

    expect(await screen.findAllByRole('radio')).toHaveLength(2);
    await fireEvent.press(screen.getByRole('radio', { name: 'Backup from 2026-01-02 03:04' }));
    await fireEvent.changeText(screen.getByTestId('restore-backup-password'), BACKUP_PASSWORD);
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('button', { name: 'Continue' });
    expect(navigation.navigate).toHaveBeenCalledWith('CreatePassword');
  });

  it('shows an empty cloud and cloud errors with retry', async () => {
    await renderScreen(RestoreBackupScreen);
    expect(await screen.findByText('No backup found')).toBeTruthy();

    const env = createTestContainer({ cloudBackup: { available: false } });

    await renderScreen(RestoreBackupScreen, { env });
    expect(await screen.findByText('iCloud is not available')).toBeTruthy();
    env.cloudBackupStore.available = true;
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No backup found')).toBeTruthy();
  });

  it('checks again when iCloud had not synced the backup yet', async () => {
    const source = await setupWallet();

    await source.env.container.cloudBackupService.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: BACKUP_PASSWORD, confirmPassword: BACKUP_PASSWORD });
    const env = createTestContainer();

    await renderScreen(RestoreBackupScreen, { env });
    expect(await screen.findByText(/iCloud can take a few minutes to sync/)).toBeTruthy();
    source.env.cloudBackupStore.files.forEach((file, name) => env.cloudBackupStore.files.set(name, file));
    await fireEvent.press(screen.getByRole('button', { name: 'Check again' }));
    expect(await screen.findByTestId('restore-backup-password')).toBeTruthy();
  });

  it('deletes a stale backup only after a double confirmation', async () => {
    const env = await createEnvWithBackup();
    const [name] = [...env.cloudBackupStore.files.keys()];

    await renderScreen(RestoreBackupScreen, { env });
    await fireEvent.press(await screen.findByTestId(`restore-backup-delete-${name}`));
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancel' }));
    expect(env.cloudBackupStore.files.has(name)).toBe(true);

    await fireEvent.press(screen.getByTestId(`restore-backup-delete-${name}`));
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete' }));
    expect(env.cloudBackupStore.files.has(name)).toBe(true);
    expect(await screen.findByText('Delete permanently?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete permanently' }));

    expect(await screen.findByText('No backup found')).toBeTruthy();
    expect(env.cloudBackupStore.files.size).toBe(0);
  });

  it('asks Google Drive for access when opened', async () => {
    const env = createTestContainer({ cloudBackup: { provider: 'google-drive', requiresSignIn: true } });

    await renderScreen(RestoreBackupScreen, { env });
    expect(await screen.findByText('No backup found')).toBeTruthy();
    expect(screen.getByText('Restore from Google Drive')).toBeTruthy();
    expect(env.cloudBackupStore.signInCalls).toBe(1);
  });
});
