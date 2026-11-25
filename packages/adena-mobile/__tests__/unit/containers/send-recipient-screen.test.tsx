import { fireEvent, screen } from '@testing-library/react-native';

import { SendRecipientScreen } from '../../../src/containers/main/send-recipient-screen';
import { KeyringType } from '../../../src/crypto/keyring';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';

const RECIPIENT = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

describe('SendRecipientScreen', () => {
  beforeEach(resetStores);

  it('rejects invalid addresses and forwards a typed one with the token', async () => {
    const { env } = await setupWallet();
    const { navigation } = await renderScreen(SendRecipientScreen, { env, params: { tokenId: 'ugnot' } });
    const search = screen.getByLabelText('Address');

    await fireEvent.changeText(search, 'g1nope');
    expect(screen.getByText('Enter a valid Gno.land address.')).toBeTruthy();

    await fireEvent.changeText(search, ` ${RECIPIENT} `);
    expect(screen.queryByText('Enter a valid Gno.land address.')).toBeNull();
    await fireEvent.press(screen.getByTestId('recipient-result'));
    expect(navigation.navigate).toHaveBeenCalledWith('SendAmount', { toAddress: RECIPIENT, tokenId: 'ugnot' });

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('labels saved and own addresses and picks them from the lists', async () => {
    const { env, account, network } = await setupWallet();
    const second = await env.container.accountService.createAccount(account.keyringId, KeyringType.HD_WALLET);

    env.container.accountService.selectAccount(account.id);
    env.container.addressBookService.add({ name: 'Alice', address: RECIPIENT }, network);
    const own = env.container.accountService.getAddress(second, network);
    const { navigation } = await renderScreen(SendRecipientScreen, { env });

    await fireEvent.press(screen.getByRole('button', { name: /^Alice/ }));
    expect(navigation.navigate).toHaveBeenLastCalledWith('SendAmount', { toAddress: RECIPIENT, tokenId: undefined });
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${second.name}`) }));
    expect(navigation.navigate).toHaveBeenLastCalledWith('SendAmount', { toAddress: own, tokenId: undefined });

    await fireEvent.changeText(screen.getByLabelText('Address'), RECIPIENT);
    expect(screen.getAllByText('Alice')).toHaveLength(2);
    await fireEvent.changeText(screen.getByLabelText('Address'), own);
    expect(screen.getAllByText(second.name)).toHaveLength(2);
  });
});
