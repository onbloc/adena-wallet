import { fireEvent, screen } from '@testing-library/react-native';

import { SettingsScreen } from '../../../src/containers/main/settings-screen';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';
import { TEST_PASSWORD } from '../../helpers/test-container';

const PRIVATE_KEY = '01'.repeat(32);

describe('SettingsScreen', () => {
  beforeEach(resetStores);

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
