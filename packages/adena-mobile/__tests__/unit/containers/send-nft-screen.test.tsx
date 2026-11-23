import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SendNftScreen } from '../../../src/containers/main/send-nft-screen';
import { KeyringType } from '../../../src/crypto/keyring';
import { NftCollection, NftItem } from '../../../src/domain/nft';
import { renderScreen, resetStores, setupWallet, TestEnv, toastMessage } from '../../helpers/render-screen';
import { createTestContainer } from '../../helpers/test-container';

const RECIPIENT = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const collection: NftCollection = { id: 'gno.land/r/demo/nft.NFT.1', packagePath: 'gno.land/r/demo/nft', name: 'Demo', symbol: 'NFT', ownedCount: 1, supportsTokenUri: false, supportsMetadata: false };
const item: NftItem = { collectionId: collection.id, packagePath: collection.packagePath, nftId: '7', name: 'Demo', symbol: 'NFT' };

const setup = async () => {
  const wallet = await setupWallet();

  wallet.env.gno.state.balances[wallet.address] = '2500000ugnot';
  return wallet;
};

const render = (env: TestEnv) => renderScreen(SendNftScreen, { env, params: { collection, item } });

const enterRecipient = (value: string): Promise<unknown> => fireEvent.changeText(screen.getByLabelText('Recipient address'), value);

const review = async (): Promise<void> => {
  await enterRecipient(RECIPIENT);
  await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
  await screen.findByText('Review NFT transfer');
};

describe('SendNftScreen', () => {
  beforeEach(resetStores);

  it('validates the recipient and filters suggestions', async () => {
    const { env, account, network, address } = await setup();
    const second = await env.container.accountService.createAccount(account.keyringId, KeyringType.HD_WALLET);

    env.container.accountService.selectAccount(account.id);
    env.container.addressBookService.add({ name: 'Alice', address: RECIPIENT }, network);
    const { navigation } = await render(env);

    expect(screen.getByText('Demo #7')).toBeTruthy();
    expect(screen.getByText('Suggestions')).toBeTruthy();
    expect(screen.getByText(second.name)).toBeTruthy();

    await enterRecipient('ali');
    expect(screen.getByText('Enter a valid Gno.land address.')).toBeTruthy();
    expect(screen.queryByText(second.name)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /^Alice/ }));
    expect(screen.queryByText('Suggestions')).toBeNull();
    expect(screen.getByRole('button', { name: 'Review transfer' })).toBeEnabled();

    await enterRecipient(address);
    expect(screen.getByText('This is your current account.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review transfer' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('reviews, picks a fee tier and sends the NFT', async () => {
    const { env } = await setup();
    const { navigation } = await render(env);

    await review();
    expect(screen.getByText('Mainnet')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Fast' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm send' }));

    await waitFor(() => expect(navigation.popToTop).toHaveBeenCalled());
    expect(env.gno.state.broadcasts).toHaveLength(1);
    expect(toastMessage()).toBe('NFT sent');
  });

  it('shows broadcast failures and closes the review', async () => {
    const { env } = await setup();

    jest.spyOn(env.container.transactionService, 'signAndBroadcast').mockRejectedValueOnce(new Error('out of gas'));
    await render(env);
    await review();
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm send' }));
    expect(await screen.findByText('out of gas')).toBeTruthy();

    await fireEvent.press(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
    await waitFor(() => expect(screen.queryByText('out of gas')).toBeNull());
  });

  it('shows preparation failures and clears them on edit', async () => {
    const { env } = await setup();

    jest.spyOn(env.container.transactionService, 'estimateFee').mockRejectedValueOnce(new Error('simulation failed'));
    await render(env);
    await enterRecipient(RECIPIENT);
    await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
    expect(await screen.findByText('simulation failed')).toBeTruthy();

    await enterRecipient(`${RECIPIENT} `);
    expect(screen.queryByText('simulation failed')).toBeNull();
  });

  it('refuses to prepare without an account', async () => {
    await render(createTestContainer());
    await enterRecipient(RECIPIENT);
    await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));

    expect(await screen.findByText('No account selected')).toBeTruthy();
  });
});
