import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AccountsScreen } from '../../../src/containers/main/accounts-screen';
import { KeyringType } from '../../../src/crypto/keyring';
import { SecretImportMode } from '../../../src/domain/account';
import { useSessionStore } from '../../../src/stores/session.store';
import { useToastStore } from '../../../src/stores/toast.store';
import { renderScreen, resetStores, setupWallet, toastMessage } from '../../helpers/render-screen';
import { TEST_PASSWORD } from '../../helpers/test-container';

const PRIVATE_KEY = '01'.repeat(32);
const row = (name: string): RegExp => new RegExp(`^${name},`);

describe('AccountsScreen', () => {
  beforeEach(resetStores);

  it('lists accounts and derives a new one from the current HD keyring', async () => {
    const { env, account } = await setupWallet();
    const { navigation } = await renderScreen(AccountsScreen, { env });

    expect(screen.getByText('1 accounts')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add account' }));

    await waitFor(() => expect(screen.getByText('2 accounts')).toBeTruthy());
    const created = env.container.accountService.getCurrentAccount();

    expect(created?.id).not.toBe(account.id);
    expect(created?.keyringId).toBe(account.keyringId);
    expect(toastMessage()).toBe(`${created?.name} added`);
    expect(useToastStore.getState().toast?.tone).toBe('success');

    await fireEvent.press(screen.getByRole('button', { name: row(account.name) }));
    expect(env.container.accountService.getCurrentAccount()?.id).toBe(account.id);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().revision).toBeGreaterThan(1);

    await fireEvent.press(screen.getByRole('button', { name: row(account.name) }));
    expect(navigation.navigate).toHaveBeenCalledWith('AccountSettings', { accountId: account.id });
  });

  it('derives from the first HD keyring when an imported key is selected', async () => {
    const { env, account } = await setupWallet();
    const imported = await env.container.walletService.importPrivateKey(PRIVATE_KEY, TEST_PASSWORD, 'Imported');

    env.container.accountService.selectAccount(imported.id);
    await renderScreen(AccountsScreen, { env });

    expect(screen.getByRole('button', { name: /^Imported,.*Imported key$/ })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add account' }));

    await waitFor(() => expect(screen.getByText('3 accounts')).toBeTruthy());
    expect(env.container.accountService.getCurrentAccount()?.keyringId).toBe(account.keyringId);
  });

  it('sends the user to import a phrase when there is no HD keyring', async () => {
    const { env, account } = await setupWallet();

    await env.container.walletService.importPrivateKey(PRIVATE_KEY, TEST_PASSWORD, 'Imported');
    await env.container.walletService.removeAccount(account.id, TEST_PASSWORD);
    expect(env.container.accountService.getAccounts().every(item => item.keyringType === KeyringType.PRIVATE_KEY)).toBe(true);
    const { navigation } = await renderScreen(AccountsScreen, { env });

    await fireEvent.press(screen.getByRole('button', { name: 'Add account' }));
    expect(navigation.navigate).toHaveBeenCalledWith('ImportAccount', { mode: SecretImportMode.MNEMONIC });
  });

  it('shows a toast when the account cannot be created', async () => {
    const { env } = await setupWallet();

    jest.spyOn(env.container.accountService, 'createAccount').mockRejectedValueOnce(new Error('Keyring locked'));
    await renderScreen(AccountsScreen, { env });
    await fireEvent.press(screen.getByRole('button', { name: 'Add account' }));

    await waitFor(() => expect(toastMessage()).toBe('Keyring locked'));
    expect(useToastStore.getState().toast?.tone).toBe('error');
    expect(screen.getByRole('button', { name: 'Add account' })).toBeTruthy();
  });

  it('opens the import flows and goes back', async () => {
    const { env } = await setupWallet();
    const { navigation } = await renderScreen(AccountsScreen, { env });

    await fireEvent.press(screen.getByRole('button', { name: 'Import recovery phrase' }));
    expect(navigation.navigate).toHaveBeenCalledWith('ImportAccount', { mode: SecretImportMode.MNEMONIC });
    await fireEvent.press(screen.getByRole('button', { name: 'Import private key' }));
    expect(navigation.navigate).toHaveBeenCalledWith('ImportAccount', { mode: SecretImportMode.PRIVATE_KEY });
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });
});
