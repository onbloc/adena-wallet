import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { CloudBackupScreen } from '../../../src/containers/main/cloud-backup-screen';
import { AppError, AppErrorCode } from '../../../src/core/errors';
import { KeyringType } from '../../../src/crypto/keyring';
import { backupFileName, backupVersionFileName } from '../../../src/repositories/cloud-backup/cloud-backup-store';
import { renderScreen, resetStores, setupWallet, toastMessage } from '../../helpers/render-screen';
import { createTestContainer, TEST_PASSWORD } from '../../helpers/test-container';

const BACKUP_PASSWORD = 'violet orbit lantern 42';

const enterWalletPassword = async (password = TEST_PASSWORD): Promise<void> => {
  await fireEvent.changeText(await screen.findByTestId('password-sheet-input'), password);
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
};

const enterBackupPassword = async (password = BACKUP_PASSWORD, confirm = password): Promise<void> => {
  await fireEvent.changeText(await screen.findByTestId('backup-password-input'), password);
  await fireEvent.changeText(screen.getByTestId('backup-password-confirm'), confirm);
  await fireEvent.press(screen.getByTestId('backup-password-submit'));
};

describe('CloudBackupScreen', () => {
  beforeEach(resetStores);

  it('backs up after the wallet password and a new backup password', async () => {
    const { env } = await setupWallet();

    await renderScreen(CloudBackupScreen, { env });
    await fireEvent.press(await screen.findByRole('button', { name: 'Back up now' }));
    await enterWalletPassword();
    expect(await screen.findByText('Create a backup password')).toBeTruthy();
    await enterBackupPassword();

    expect(await screen.findByText('Your backup is ready')).toBeTruthy();
    expect(screen.getByLabelText('Recovery phrase, Backed up')).toBeTruthy();
    expect(env.cloudBackupStore.files.size).toBe(1);
    expect(toastMessage()).toBe('Backed up to iCloud');
  });

  it('takes the wallet password from biometrics first, and never for the backup password', async () => {
    const { env } = await setupWallet();

    await env.container.walletService.enableBiometricUnlock(TEST_PASSWORD);
    await renderScreen(CloudBackupScreen, { env });
    await fireEvent.press(await screen.findByRole('button', { name: 'Back up now' }));

    expect(await screen.findByText('Create a backup password')).toBeTruthy();
    // The released wallet password is checked against the backup password like a typed one.
    await enterBackupPassword(TEST_PASSWORD);
    expect(await screen.findByText('Use a different password from your wallet password')).toBeTruthy();
    await enterBackupPassword();
    expect(await screen.findByText('Your backup is ready')).toBeTruthy();
    expect(env.cloudBackupStore.files.size).toBe(1);
  });

  it('deletes a backup with biometrics first', async () => {
    const { env } = await setupWallet();

    await env.container.cloudBackupService.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: BACKUP_PASSWORD, confirmPassword: BACKUP_PASSWORD });
    await env.container.walletService.enableBiometricUnlock(TEST_PASSWORD);
    await renderScreen(CloudBackupScreen, { env });
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete backup' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('button', { name: 'Back up now' })).toBeTruthy();
    expect(env.cloudBackupStore.files.size).toBe(0);
  });

  it('rejects a wrong wallet password in the sheet', async () => {
    const { env } = await setupWallet();

    await renderScreen(CloudBackupScreen, { env });
    await fireEvent.press(await screen.findByRole('button', { name: 'Back up now' }));
    await enterWalletPassword('wrong password!');
    expect(await screen.findByText('Incorrect password.')).toBeTruthy();
    expect(screen.queryByText('Create a backup password')).toBeNull();
  });

  it('places backup password problems next to the right field', async () => {
    const { env } = await setupWallet();

    await renderScreen(CloudBackupScreen, { env });
    await fireEvent.press(await screen.findByRole('button', { name: 'Back up now' }));
    await enterWalletPassword();
    await enterBackupPassword(BACKUP_PASSWORD, 'something else 1');
    expect(await screen.findByText('Passwords do not match')).toBeTruthy();
    await enterBackupPassword(TEST_PASSWORD);
    expect(await screen.findByText('Use a different password from your wallet password')).toBeTruthy();
    await enterBackupPassword('short');
    expect(await screen.findByText('Backup password must be 12~256 characters')).toBeTruthy();
    expect(env.cloudBackupStore.files.size).toBe(0);
  });

  it('rates the backup password against the backup policy, not the wallet one', async () => {
    const { env } = await setupWallet();

    await renderScreen(CloudBackupScreen, { env });
    await fireEvent.press(await screen.findByRole('button', { name: 'Back up now' }));
    await enterWalletPassword();
    // A valid wallet password (zxcvbn 2) reads as too weak here and is refused.
    await fireEvent.changeText(await screen.findByTestId('backup-password-input'), 'sunshine2024!');
    expect(screen.getByText('Password strength: Too weak')).toBeTruthy();
    expect(screen.getByTestId('backup-password-input').props.textContentType).toBe('none');
    expect(screen.getByTestId('backup-password-input').props.autoComplete).toBe('off');
    expect(screen.getByTestId('backup-password-input').props.importantForAutofill).toBe('noExcludeDescendants');
    await enterBackupPassword('sunshine2024!');
    expect(await screen.findByText('Backup password is too easy to guess. Add more unrelated words or characters.')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('backup-password-input'), 'tangerine kayak');
    expect(screen.getByText('Password strength: Good')).toBeTruthy();
    expect(env.cloudBackupStore.files.size).toBe(0);
  });

  it('shows a cloud failure and returns to the previous state', async () => {
    const { env } = await setupWallet();

    await renderScreen(CloudBackupScreen, { env });
    await fireEvent.press(await screen.findByRole('button', { name: 'Back up now' }));
    await enterWalletPassword();
    env.cloudBackupStore.failNext(new AppError(AppErrorCode.CLOUD_BACKUP_QUOTA));
    await enterBackupPassword();

    expect(await screen.findByText('iCloud storage is full')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back up now' })).toBeTruthy();
  });

  it('drops the password step on back and when the app goes to the background', async () => {
    const { env } = await setupWallet();
    const listeners: ((state: string) => void)[] = [];

    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_event: string, listener: (state: string) => void) => {
      listeners.push(listener);
      return { remove: jest.fn() };
    }) as never);
    const { navigation } = await renderScreen(CloudBackupScreen, { env });

    await fireEvent.press(await screen.findByRole('button', { name: 'Back up now' }));
    await enterWalletPassword();
    await screen.findByText('Create a backup password');
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByText('Create a backup password')).toBeNull();
    expect(navigation.goBack).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Back up now' }));
    await enterWalletPassword();
    await screen.findByText('Create a backup password');
    await act(async () => listeners.forEach(listener => listener('background')));
    expect(screen.queryByText('Create a backup password')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('shows an outdated backup and backs up again', async () => {
    const { env, account } = await setupWallet();

    await env.container.cloudBackupService.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: BACKUP_PASSWORD, confirmPassword: BACKUP_PASSWORD });
    await env.container.accountService.createAccount(account.keyringId, KeyringType.HD_WALLET);
    await renderScreen(CloudBackupScreen, { env });

    expect(await screen.findByText('Your backup is out of date')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back up again' }));
    await enterWalletPassword();
    await enterBackupPassword();
    expect(await screen.findByText('Your backup is ready')).toBeTruthy();
  });

  it('deletes the backup after confirmation and keeps the wallet', async () => {
    const { env } = await setupWallet();

    await env.container.cloudBackupService.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: BACKUP_PASSWORD, confirmPassword: BACKUP_PASSWORD });
    await renderScreen(CloudBackupScreen, { env });
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete backup' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete' }));
    await fireEvent.changeText(await screen.findByTestId('password-sheet-input'), 'wrong password!');
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Incorrect password.')).toBeTruthy();
    expect(env.cloudBackupStore.files.size).toBe(1);
    await fireEvent.changeText(screen.getByTestId('password-sheet-input'), TEST_PASSWORD);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('button', { name: 'Back up now' })).toBeTruthy();
    expect(env.cloudBackupStore.files.size).toBe(0);
    expect(await env.container.walletService.getStatus()).toBe('unlocked');
  });

  it('reports a failed delete', async () => {
    const { env } = await setupWallet();

    await env.container.cloudBackupService.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: BACKUP_PASSWORD, confirmPassword: BACKUP_PASSWORD });
    await renderScreen(CloudBackupScreen, { env });
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete backup' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete' }));
    await fireEvent.changeText(await screen.findByTestId('password-sheet-input'), TEST_PASSWORD);
    env.cloudBackupStore.failNext(new AppError(AppErrorCode.NETWORK_ERROR));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Can\'t reach iCloud')).toBeTruthy();
    expect(env.cloudBackupStore.files.size).toBe(1);
  });

  it('lists every backup in the account and deletes another wallet\'s backup with the wallet password', async () => {
    const { env } = await setupWallet();
    const other = backupFileName('9'.repeat(32));

    await env.container.cloudBackupService.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: BACKUP_PASSWORD, confirmPassword: BACKUP_PASSWORD });
    env.cloudBackupStore.files.set(other, { contents: '{}', modifiedAt: 1 });
    await renderScreen(CloudBackupScreen, { env });

    expect(await screen.findByText('This wallet')).toBeTruthy();
    expect(screen.getByText('Another wallet or device')).toBeTruthy();
    await fireEvent.press(screen.getByTestId(`cloud-backup-item-delete-${other}`));
    expect(await screen.findByText(/belongs to another wallet or device/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    await fireEvent.changeText(await screen.findByTestId('password-sheet-input'), TEST_PASSWORD);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(env.cloudBackupStore.files.has(other)).toBe(false));
    await waitFor(() => expect(screen.queryByText('Another wallet or device')).toBeNull());
    expect(screen.getByText('Your backup is ready')).toBeTruthy();
  });

  it('warns about a backup updated on another device and replaces it only after confirmation', async () => {
    const { env } = await setupWallet();

    await env.container.cloudBackupService.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: BACKUP_PASSWORD, confirmPassword: BACKUP_PASSWORD });
    const [[, file]] = [...env.cloudBackupStore.files];
    const envelope = JSON.parse(file.contents);
    const name = backupVersionFileName(envelope.backupId, 2, 'b'.repeat(16));

    // Another device wrote revision 2 (only the header matters for the status check).
    env.cloudBackupStore.files.set(name, { ...file, contents: JSON.stringify({ ...envelope, revision: 2, createdAt: envelope.createdAt + 1 }) });
    await renderScreen(CloudBackupScreen, { env });

    expect((await screen.findAllByText('Updated on another device')).length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Back up again' }));
    await enterWalletPassword();
    await enterBackupPassword();
    expect(await screen.findByText('Replace the backup?')).toBeTruthy();
    expect(JSON.parse(env.cloudBackupStore.files.get(name)!.contents).revision).toBe(2);
    await fireEvent.press(screen.getByRole('button', { name: 'Replace' }));

    expect(await screen.findByText('Your backup is ready')).toBeTruthy();
    expect(JSON.parse(env.cloudBackupStore.files.get(name)!.contents).revision).toBe(2);
    expect([...env.cloudBackupStore.files.values()].map(stored => JSON.parse(stored.contents).revision)).toContain(3);
  });

  it('shows an unavailable cloud and retries', async () => {
    const { env } = await setupWallet();

    await env.container.cloudBackupService.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: BACKUP_PASSWORD, confirmPassword: BACKUP_PASSWORD });
    env.cloudBackupStore.available = false;
    await renderScreen(CloudBackupScreen, { env });

    expect(await screen.findByText('iCloud is not available')).toBeTruthy();
    env.cloudBackupStore.available = true;
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Your backup is ready')).toBeTruthy();
  });

  it('asks for Google Drive access when retrying a signed-out status check', async () => {
    const env = createTestContainer({ cloudBackup: { provider: 'google-drive' } });

    await setupWallet(env);
    await env.container.cloudBackupService.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: BACKUP_PASSWORD, confirmPassword: BACKUP_PASSWORD });
    env.cloudBackupStore.signedIn = false;
    await renderScreen(CloudBackupScreen, { env });

    expect(await screen.findByText('Not signed in to Google Drive')).toBeTruthy();
    expect(screen.getByText('Google Drive backup')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('Your backup is ready')).toBeTruthy());
    expect(env.cloudBackupStore.signInCalls).toBeGreaterThan(1);
  });

  // iCloud uploads in the background: a local copy is not reported as backed up.
  it('shows an upload still running instead of success, and confirms it on focus', async () => {
    const env = createTestContainer({ cloudBackup: { backgroundUploads: true } });

    await setupWallet(env);
    const { navigation } = await renderScreen(CloudBackupScreen, { env });

    await fireEvent.press(await screen.findByRole('button', { name: 'Back up now' }));
    await enterWalletPassword();
    await enterBackupPassword();

    expect(await screen.findByText('Uploading to iCloud…')).toBeTruthy();
    expect(screen.getByLabelText('Recovery phrase, Uploading')).toBeTruthy();
    expect(toastMessage()).toBeUndefined();
    expect(env.container.cloudBackupService.getLocalStatus()).toMatchObject({ uploading: {} });

    await act(() => navigation.emit('focus'));
    expect(await screen.findByText('Uploading to iCloud…')).toBeTruthy();
    expect(toastMessage()).toBeUndefined();

    env.cloudBackupStore.finishUpload([...env.cloudBackupStore.files.keys()][0]);
    await act(() => navigation.emit('focus'));
    expect(await screen.findByText('Your backup is ready')).toBeTruthy();
    expect(screen.getByLabelText('Recovery phrase, Backed up')).toBeTruthy();
    expect(toastMessage()).toBe('Backed up to iCloud');
  });

  it('shows an upload error after returning to the foreground and checks again', async () => {
    const env = createTestContainer({ cloudBackup: { backgroundUploads: true } });
    const listeners: ((state: string) => void)[] = [];

    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_event: string, listener: (state: string) => void) => {
      listeners.push(listener);
      return { remove: jest.fn() };
    }) as never);
    await setupWallet(env);
    await env.container.cloudBackupService.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: BACKUP_PASSWORD, confirmPassword: BACKUP_PASSWORD });
    const [name] = [...env.cloudBackupStore.files.keys()];

    await renderScreen(CloudBackupScreen, { env });
    expect(await screen.findByText('Uploading to iCloud…')).toBeTruthy();

    env.cloudBackupStore.failUpload(name, new AppError(AppErrorCode.CLOUD_BACKUP_QUOTA, 'iCloud storage is full'));
    await act(async () => listeners.forEach(listener => listener('active')));
    expect(await screen.findByText('Couldn\'t upload to iCloud yet')).toBeTruthy();
    expect(screen.getByText(/Free up iCloud storage/)).toBeTruthy();
    expect(env.container.cloudBackupService.getLocalStatus()).toMatchObject({ uploading: {} });

    env.cloudBackupStore.finishUpload(name);
    await fireEvent.press(screen.getByRole('button', { name: 'Check again' }));
    expect(await screen.findByText('Your backup is ready')).toBeTruthy();
    jest.restoreAllMocks();
  });
});
