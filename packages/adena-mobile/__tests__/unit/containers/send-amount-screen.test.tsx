import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SendAmountScreen } from '../../../src/containers/main/send-amount-screen';
import { KeyringType } from '../../../src/crypto/keyring';
import { renderScreen, resetStores, setupWallet, TestEnv, toastMessage } from '../../helpers/render-screen';
import { API_URL, createTestContainer, RESOURCE_BASE } from '../../helpers/test-container';

const RECIPIENT = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const PERUN = 'gno.land/r/demo/defi/grc20factory.PERUN';

const setup = async (balance = '2500000ugnot') => {
  const wallet = await setupWallet(createTestContainer());
  const { env, address } = wallet;

  env.http
    .on(`${RESOURCE_BASE}/gno-native/gnoland-1.json`, [{ denom: 'ugnot', name: 'Gno.land', symbol: 'GNOT', decimals: 6, image: '/gno-native/images/ugnot.svg' }])
    .on(`${RESOURCE_BASE}/grc20/gnoland-1.json`, [])
    .on(`${API_URL}/v1/accounts/${address}`, {
      data: {
        address,
        assets: [{ tokenType: 'GRC20', tokenId: `${PERUN}.0000001`, tokenKey: PERUN, packagePath: 'gno.land/r/demo/defi/grc20factory', name: 'Perun', symbol: 'PERUN', decimals: 6, amount: '5', logoUrl: null, address }],
      },
    })
    .on(`${API_URL}/v1/prices`, { data: { items: [] } });
  env.gno.state.balances[address] = balance;
  env.gno.state.evaluate = (_pkg, expression): string => (expression.includes('BalanceOf')
    ? (expression.match(/Get\("/g) ?? []).map(() => '(true bool)\n(7000000 int64)').join('\n')
    : '("Perun" string)\n("PERUN" string)\n(6 int)');

  return wallet;
};

const render = (env: TestEnv, params: object = {}) => renderScreen(SendAmountScreen, { env, params: { toAddress: RECIPIENT, ...params } });

const press = async (...keys: string[]): Promise<void> => {
  for (const key of keys) {
    await fireEvent.press(screen.getByRole('keyboardkey', { name: key }));
  }
};

const waitForBalance = (label: string): Promise<unknown> => waitFor(() => expect(screen.getByText(label)).toBeTruthy());

describe('SendAmountScreen', () => {
  beforeEach(resetStores);

  it('types an amount with the keypad and flags amounts above the balance', async () => {
    const { env } = await setup();
    const { navigation } = await render(env);

    await waitForBalance('Available 2.5 GNOT');
    expect(screen.getByText('Recipient')).toBeTruthy();
    await press('1', 'Decimal point', '5', '7', 'Delete');
    expect(screen.getByText('1.5')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review transfer' })).toBeEnabled();

    await press('Delete', 'Delete', 'Delete', '9', '9', '9');
    expect(screen.getByText('Insufficient balance')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review transfer' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('fills MAX for the native coin leaving room for the fee', async () => {
    const { env } = await setup();

    await render(env);
    await waitForBalance('Available 2.5 GNOT');
    await fireEvent.press(screen.getByRole('button', { name: 'Max' }));
    expect(await screen.findByText('2.499867')).toBeTruthy();
  });

  it('leaves the amount empty when the fee exceeds the balance on MAX', async () => {
    const { env } = await setup('100ugnot');

    await render(env);
    await waitForBalance('Available 0.0001 GNOT');
    await press('1');
    await fireEvent.press(screen.getByRole('button', { name: 'Max' }));
    await waitFor(() => expect(screen.getAllByText('0')).toHaveLength(2));
    expect(screen.getByRole('button', { name: 'Review transfer' })).toBeDisabled();
  });

  it('shows MAX failures', async () => {
    const { env } = await setup();

    jest.spyOn(env.container.transactionService, 'maxTransferAmount').mockRejectedValueOnce(new Error('simulation failed'));
    await render(env);
    await waitForBalance('Available 2.5 GNOT');
    await fireEvent.press(screen.getByRole('button', { name: 'Max' }));
    expect(await screen.findByText('simulation failed')).toBeTruthy();
  });

  it('reviews, switches fee tiers and broadcasts the transfer', async () => {
    const { env } = await setup();

    env.container.addressBookService.add({ name: 'Alice', address: RECIPIENT }, env.container.networkService.getCurrentNetwork());
    const { navigation } = await render(env);

    expect(screen.getByText('Alice')).toBeTruthy();
    await waitForBalance('Available 2.5 GNOT');
    await fireEvent.press(screen.getByRole('button', { name: 'Memo, Optional' }));
    await fireEvent.changeText(screen.getByLabelText('Memo (optional)'), 'thanks');
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('button', { name: 'Memo, thanks' })).toBeTruthy();

    await press('1');
    await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
    expect(await screen.findByText('1 GNOT')).toBeTruthy();
    expect(screen.getByText('1.000111 GNOT')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Fast' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Custom' }));
    await fireEvent.changeText(screen.getByLabelText('Gas multiplier'), '0.5');
    expect(screen.getByText('Network fee too low')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm send' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Average' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Confirm send' }));
    await waitFor(() => expect(navigation.popToTop).toHaveBeenCalled());
    expect(env.gno.state.broadcasts).toHaveLength(1);
    expect(toastMessage()).toBe('Transaction confirmed');
  });

  it('reports a failed broadcast and closes the review', async () => {
    const { env } = await setup();

    jest.spyOn(env.container.transactionService, 'signAndBroadcast').mockRejectedValueOnce(new Error('node rejected the tx'));
    const { navigation } = await render(env);

    await waitForBalance('Available 2.5 GNOT');
    await press('1');
    await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Confirm send' }));
    expect(await screen.findByText('node rejected the tx')).toBeTruthy();
    expect(navigation.popToTop).not.toHaveBeenCalled();

    await fireEvent.press(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
    await waitFor(() => expect(screen.queryByText('node rejected the tx')).toBeNull());
  });

  it('shows preparation errors such as an invalid recipient', async () => {
    const { env } = await setup();

    await render(env, { toAddress: 'g1invalid' });
    await waitForBalance('Available 2.5 GNOT');
    await press('1');
    await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
    expect(await screen.findByText('Enter a valid address')).toBeTruthy();
    await press('2');
    expect(screen.queryByText('Enter a valid address')).toBeNull();
  });

  it('switches token through the picker and omits the total for non-fee tokens', async () => {
    const { env } = await setup();

    await render(env);
    await waitForBalance('Available 2.5 GNOT');
    await press('1');
    await fireEvent.press(screen.getByRole('button', { name: 'GNOT' }));
    await fireEvent.press(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
    await fireEvent.press(screen.getByRole('button', { name: 'GNOT' }));
    await fireEvent.press(await screen.findByRole('button', { name: /^Perun/ }));

    await waitForBalance('Available 7 PERUN');
    expect(screen.getAllByText('0')).toHaveLength(2);
    await press('2');
    await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
    expect(await screen.findByText('2 PERUN')).toBeTruthy();
    expect(screen.queryByText('Total')).toBeNull();
  });

  it('starts from the requested token and labels own accounts as recipients', async () => {
    const { env, account, network } = await setup();
    const second = await env.container.accountService.createAccount(account.keyringId, KeyringType.HD_WALLET);

    env.container.accountService.selectAccount(account.id);
    const own = env.container.accountService.getAddress(second, network);

    await render(env, { toAddress: own, tokenId: PERUN });
    expect(screen.getByText(second.name)).toBeTruthy();
    await waitForBalance('Available 7 PERUN');
  });

  it('falls back to the native token for an unknown token id', async () => {
    const { env } = await setup();

    await render(env, { tokenId: 'gno.land/r/unknown.X' });
    await waitForBalance('Available 2.5 GNOT');
  });

  it('cannot review without an account', async () => {
    await render(createTestContainer());
    expect(screen.getByText('Available … GNOT')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Max' })).toBeDisabled();
  });
});
