import Clipboard from '@react-native-clipboard/clipboard';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AccountSettingsScreen } from '../../../src/containers/main/account-settings-screen';
import { KeyringType } from '../../../src/crypto/keyring';
import { renderScreen, resetStores, setupWallet, toastMessage } from '../../helpers/render-screen';
import { TEST_PASSWORD } from '../../helpers/test-container';

const PRIVATE_KEY = '01'.repeat(32);

describe('AccountSettingsScreen', () => {
  beforeEach(resetStores);

  it('opens Edit profile for renaming', async () => {
    const { env, account } = await setupWallet();
    const { navigation } = await renderScreen(AccountSettingsScreen, { env, params: { accountId: account.id } });

    expect(screen.getByText('Recovery phrase · #1')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Edit profile' }));
    expect(navigation.navigate).toHaveBeenCalledWith('EditProfile', { accountId: account.id });
  });

  it('copies the address and opens related screens', async () => {
    const { env, account, address } = await setupWallet();
    const { navigation } = await renderScreen(AccountSettingsScreen, { env, params: { accountId: account.id } });

    await fireEvent.press(screen.getByRole('button', { name: 'Copy address' }));
    expect(Clipboard.setString).toHaveBeenCalledWith(address);
    expect(toastMessage()).toBe('Address copied');

    await fireEvent.press(screen.getByRole('button', { name: /^Manage connections/ }));
    expect(navigation.navigate).toHaveBeenCalledWith('ConnectedApps');
    await fireEvent.press(screen.getByRole('button', { name: 'Recovery phrase' }));
    expect(navigation.navigate).toHaveBeenCalledWith('RecoveryPhrase', { keyringId: account.keyringId });
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('hides removal for the last account', async () => {
    const { env, account } = await setupWallet();

    await renderScreen(AccountSettingsScreen, { env, params: { accountId: account.id } });
    expect(screen.queryByRole('button', { name: 'Remove account' })).toBeNull();
  });

  it('removes an imported account behind the password gate', async () => {
    const { env } = await setupWallet();
    const imported = await env.container.walletService.importPrivateKey(PRIVATE_KEY, 'Imported');
    const { navigation } = await renderScreen(AccountSettingsScreen, { env, params: { accountId: imported.id } });

    expect(screen.getByText('Imported key')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Recovery phrase' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Remove account' }));
    const input = await screen.findByTestId('password-sheet-input');

    await fireEvent.changeText(input, 'wrong password');
    await fireEvent.press(screen.getByRole('button', { name: 'Remove' }));
    expect(await screen.findByText('Incorrect password.')).toBeTruthy();
    expect(navigation.popToTop).not.toHaveBeenCalled();

    await fireEvent.changeText(input, TEST_PASSWORD);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(navigation.popToTop).toHaveBeenCalled());
    expect(toastMessage()).toBe('Account removed');
    expect(env.container.accountService.getAccounts().map(item => item.keyringType)).toEqual([KeyringType.HD_WALLET]);
  });

  it('renders nothing for an unknown account', async () => {
    const { env } = await setupWallet();

    await renderScreen(AccountSettingsScreen, { env, params: { accountId: 'missing' } });
    expect(screen.queryByText('Account settings')).toBeNull();
  });
});
