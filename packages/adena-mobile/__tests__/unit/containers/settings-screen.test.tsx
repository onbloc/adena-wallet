import { act, fireEvent, screen } from '@testing-library/react-native';

import { SettingsScreen } from '../../../src/containers/main/settings-screen';
import { KeyringType } from '../../../src/crypto/keyring';
import { Spec } from '../../../src/native/NativeAdenaCloudBackup';
import { CloudBackupProvider } from '../../../src/repositories/cloud-backup/cloud-backup-store';
import { NativeCloudBackupStore } from '../../../src/repositories/cloud-backup/native-cloud-backup-store';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';
import { createTestContainer, TEST_PASSWORD } from '../../helpers/test-container';

const PRIVATE_KEY = '01'.repeat(32);

describe('SettingsScreen', () => {
  beforeEach(resetStores);
  // Lets the cloud backup queries settle inside act before the next test.
  afterEach(() => act(() => new Promise<void>(resolve => setTimeout(resolve, 0))));

  it('has no biometric switch; biometrics are set on the change password page', async () => {
    const { env } = await setupWallet();

    await renderScreen(SettingsScreen, { env });
    expect(await screen.findByRole('button', { name: 'Change password' })).toBeTruthy();
    expect(screen.queryByRole('switch', { name: 'Face ID' })).toBeNull();
  });

  it('persists the haptics preference', async () => {
    const { env } = await setupWallet();
    const initial = env.container.preferenceService.get().hapticsEnabled;

    await renderScreen(SettingsScreen, { env });
    await fireEvent.press(screen.getByRole('switch', { name: 'Haptic touch' }));

    expect(env.container.preferenceService.get().hapticsEnabled).toBe(!initial);
    expect(screen.getByRole('switch', { name: 'Haptic touch' }).props.accessibilityState.checked).toBe(!initial);
  });

  it('navigates from every row', async () => {
    const { env, account, network } = await setupWallet();

    env.container.connectedAppService.touch('exampleapp:', { name: 'Example' }, account.id, network.id);
    const { navigation } = await renderScreen(SettingsScreen, { env });

    await fireEvent.press(screen.getByRole('button', { name: `Network, ${network.networkName}` }));
    await fireEvent.press(screen.getByRole('button', { name: 'Accounts, 1' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Connected apps, 1' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Address book' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Recovery phrase' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Reset wallet' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(navigation.navigate.mock.calls).toEqual([
      ['Networks'],
      ['Accounts'],
      ['ConnectedApps'],
      ['AddressBook'],
      ['RecoveryPhrase', { keyringId: account.keyringId }],
      ['ResetWallet'],
    ]);
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('falls back to the first HD keyring for the recovery phrase', async () => {
    const { env, account } = await setupWallet();
    const imported = await env.container.walletService.importPrivateKey(PRIVATE_KEY, 'Imported');

    env.container.accountService.selectAccount(imported.id);
    const { navigation } = await renderScreen(SettingsScreen, { env });

    await fireEvent.press(screen.getByRole('button', { name: 'Recovery phrase' }));
    expect(navigation.navigate).toHaveBeenCalledWith('RecoveryPhrase', { keyringId: account.keyringId });
  });

  it('does nothing for the recovery phrase without an HD keyring', async () => {
    const { env, account } = await setupWallet();

    await env.container.walletService.importPrivateKey(PRIVATE_KEY, 'Imported');
    await env.container.walletService.removeAccount(account.id, TEST_PASSWORD);
    const { navigation } = await renderScreen(SettingsScreen, { env });

    await fireEvent.press(screen.getByRole('button', { name: 'Recovery phrase' }));
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('locks the wallet', async () => {
    const { env } = await setupWallet();
    const { client } = await renderScreen(SettingsScreen, { env });
    const clear = jest.spyOn(client, 'clear');

    await fireEvent.press(screen.getByRole('button', { name: 'Lock wallet' }));

    expect(useSessionStore.getState().status).toBe(SessionStatus.LOCKED);
    expect(env.container.keyringSession.isUnlocked()).toBe(false);
    expect(clear).toHaveBeenCalled();
  });

  it('opens the cloud backup and flags an outdated one', async () => {
    const { env, account } = await setupWallet();
    const { navigation } = await renderScreen(SettingsScreen, { env });

    await fireEvent.press(await screen.findByRole('button', { name: 'iCloud backup' }));
    expect(navigation.navigate).toHaveBeenCalledWith('CloudBackup');

    await env.container.cloudBackupService.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: 'violet orbit lantern 42', confirmPassword: 'violet orbit lantern 42' });
    await env.container.accountService.createAccount(account.keyringId, KeyringType.HD_WALLET);
    await renderScreen(SettingsScreen, { env });
    expect(await screen.findByRole('button', { name: 'iCloud backup, Out of date' })).toBeTruthy();
  });

  // Drive access is asked for on tap, so neither a missing grant nor a missing backup hides the row.
  it('shows the Google Drive row before access is granted and before any backup exists', async () => {
    const drive = await setupWallet(createTestContainer({ cloudBackup: { provider: 'google-drive', requiresSignIn: true } }));
    const { navigation } = await renderScreen(SettingsScreen, { env: drive.env });

    await fireEvent.press(await screen.findByRole('button', { name: 'Google Drive backup' }));
    expect(navigation.navigate).toHaveBeenCalledWith('CloudBackup');
    expect(drive.env.cloudBackupStore.signInCalls).toBe(0);
    expect(drive.env.cloudBackupStore.files.size).toBe(0);
  });

  it('shows the Google Drive row whenever the native module reports Play services', async () => {
    const native = {
      isAvailable: jest.fn(async () => true),
      signIn: jest.fn(),
      list: jest.fn(async () => {
        throw Object.assign(new Error('not granted'), { code: 'E_NOT_SIGNED_IN' });
      }),
      read: jest.fn(),
      write: jest.fn(),
      remove: jest.fn(),
    } as unknown as Spec;
    const { env } = await setupWallet(createTestContainer({ cloudBackupStoreOverride: new NativeCloudBackupStore(native, CloudBackupProvider.GOOGLE_DRIVE) }));

    await renderScreen(SettingsScreen, { env });
    expect(await screen.findByRole('button', { name: 'Google Drive backup' })).toBeTruthy();
    expect(native.signIn).not.toHaveBeenCalled();
  });

  it('labels the row for Google Drive and hides it when the cloud is unavailable', async () => {
    const drive = await setupWallet(createTestContainer({ cloudBackup: { provider: 'google-drive' } }));

    await renderScreen(SettingsScreen, { env: drive.env });
    expect(await screen.findByRole('button', { name: 'Google Drive backup' })).toBeTruthy();

    const { env } = await setupWallet(createTestContainer({ cloudBackup: { available: false } }));

    await renderScreen(SettingsScreen, { env });
    await screen.findByRole('button', { name: 'Change password' });
    expect(screen.queryByText('iCloud backup')).toBeNull();
  });
});
