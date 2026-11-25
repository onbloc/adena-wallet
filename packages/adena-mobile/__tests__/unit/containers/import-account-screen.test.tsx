import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ImportAccountScreen } from '../../../src/containers/main/import-account-screen';
import { KeyringType } from '../../../src/crypto/keyring';
import { SecretImportMode } from '../../../src/domain/account';
import { renderScreen, resetStores, setupWallet, toastMessage } from '../../helpers/render-screen';
import { TEST_MNEMONIC, TEST_PASSWORD } from '../../helpers/test-container';

const OTHER_MNEMONIC = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
const PRIVATE_KEY = '01'.repeat(32);

const settle = async (): Promise<void> => {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Import' })).toBeTruthy());
};

const fill = async (secretLabel: string, secret: string, name?: string): Promise<void> => {
  await fireEvent.changeText(screen.getByLabelText(secretLabel), secret);

  if (name !== undefined) {
    await fireEvent.changeText(screen.getByLabelText('Account name'), name);
  }
};

// The wallet is unlocked, so importing never asks for the wallet password.
describe('ImportAccountScreen', () => {
  beforeEach(resetStores);

  it('imports a recovery phrase without the wallet password, and it survives a relock', async () => {
    const { env } = await setupWallet();
    const { navigation } = await renderScreen(ImportAccountScreen, { env, params: { mode: SecretImportMode.MNEMONIC } });

    expect(screen.getByText('Import recovery phrase')).toBeTruthy();
    expect(screen.queryByLabelText('Wallet password')).toBeNull();
    await fill('Recovery phrase', OTHER_MNEMONIC, 'Second');
    await fireEvent.press(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(navigation.popToTop).toHaveBeenCalled());
    await settle();
    expect(toastMessage()).toBe('Second imported');
    env.container.walletService.lock();
    await env.container.walletService.unlock(TEST_PASSWORD);
    expect(env.container.accountService.getAccounts().filter(item => item.keyringType === KeyringType.HD_WALLET)).toHaveLength(2);
  });

  it('rejects an invalid or duplicate phrase', async () => {
    const { env } = await setupWallet();

    await renderScreen(ImportAccountScreen, { env, params: { mode: SecretImportMode.MNEMONIC } });
    await fill('Recovery phrase', 'not valid words');
    await fireEvent.press(screen.getByRole('button', { name: 'Import' }));
    expect(await screen.findByText('Invalid recovery phrase')).toBeTruthy();
    await settle();

    await fireEvent.changeText(screen.getByLabelText('Recovery phrase'), TEST_MNEMONIC);
    expect(screen.queryByText('Invalid recovery phrase')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Import' }));
    expect(await screen.findByText('This recovery phrase is already added')).toBeTruthy();
    await settle();
  });

  it('imports a private key and rejects malformed keys', async () => {
    const { env } = await setupWallet();
    const { navigation } = await renderScreen(ImportAccountScreen, { env, params: { mode: SecretImportMode.PRIVATE_KEY } });

    expect(screen.getByText('Import private key')).toBeTruthy();
    await fill('Private key', 'xyz');
    await fireEvent.press(screen.getByRole('button', { name: 'Import' }));
    expect(await screen.findByText('Invalid private key')).toBeTruthy();
    await settle();

    await fireEvent.changeText(screen.getByLabelText('Private key'), `0x${PRIVATE_KEY}`);
    await fireEvent.press(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(navigation.popToTop).toHaveBeenCalled());
    await settle();
    expect(env.container.accountService.getAccounts().some(item => item.keyringType === KeyringType.PRIVATE_KEY)).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });
});
