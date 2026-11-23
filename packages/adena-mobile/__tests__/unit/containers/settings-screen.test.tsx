import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SettingsScreen } from '../../../src/containers/main/settings-screen';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';
import { renderScreen, resetStores, setupWallet, toastMessage } from '../../helpers/render-screen';
import { TEST_PASSWORD } from '../../helpers/test-container';

const PRIVATE_KEY = '01'.repeat(32);

describe('SettingsScreen', () => {
  beforeEach(resetStores);

  it('enables biometrics behind the password sheet and disables them again', async () => {
    const { env } = await setupWallet();

    await renderScreen(SettingsScreen, { env });
    const toggle = await screen.findByRole('switch', { name: 'Face ID' });

    expect(toggle).not.toBeChecked();
    await fireEvent.press(toggle);
    const input = await screen.findByTestId('password-sheet-input');

    expect(screen.getByText('Enable Face ID')).toBeTruthy();
    await fireEvent.changeText(input, 'wrong password');
    await fireEvent.press(screen.getByRole('button', { name: 'Enable' }));
    expect(await screen.findByText('Incorrect password.')).toBeTruthy();

    await fireEvent.changeText(input, TEST_PASSWORD);
    await fireEvent.press(screen.getByRole('button', { name: 'Enable' }));

    await waitFor(() => expect(screen.getByRole('switch', { name: 'Face ID' })).toBeChecked());
    expect(toastMessage()).toBe('Face ID unlock enabled');
    await expect(env.container.walletService.isBiometricUnlockEnabled()).resolves.toBe(true);

    await fireEvent.press(screen.getByRole('switch', { name: 'Face ID' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Face ID' })).not.toBeChecked());
    await expect(env.container.walletService.isBiometricUnlockEnabled()).resolves.toBe(false);
  });

  it('hides the biometric switch on devices without biometrics', async () => {
    const { env } = await setupWallet();

    env.secureStore.biometryKind = null;
    const { client } = await renderScreen(SettingsScreen, { env });

    await waitFor(() => expect(client.isFetching()).toBe(0));
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
    const imported = await env.container.walletService.importPrivateKey(PRIVATE_KEY, TEST_PASSWORD, 'Imported');

    env.container.accountService.selectAccount(imported.id);
    const { navigation } = await renderScreen(SettingsScreen, { env });

    await fireEvent.press(screen.getByRole('button', { name: 'Recovery phrase' }));
    expect(navigation.navigate).toHaveBeenCalledWith('RecoveryPhrase', { keyringId: account.keyringId });
  });

  it('does nothing for the recovery phrase without an HD keyring', async () => {
    const { env, account } = await setupWallet();

    await env.container.walletService.importPrivateKey(PRIVATE_KEY, TEST_PASSWORD, 'Imported');
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
});
