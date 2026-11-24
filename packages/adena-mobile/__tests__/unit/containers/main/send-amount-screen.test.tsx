import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SendAmountScreen } from '../../../../src/containers/main/send-amount-screen';
import { FeeEstimate, GNO_FEE_POLICY } from '../../../../src/domain/fee';
import { Token, TokenType } from '../../../../src/domain/token';
import { TransactionDraft } from '../../../../src/domain/transaction';
import { useWalletAssets } from '../../../../src/hooks/use-wallet-assets';
import { ACCOUNT, createWrapper, NETWORK } from '../../../helpers/query-wrapper';

jest.mock('../../../../src/hooks/use-wallet-assets', () => ({ useWalletAssets: jest.fn() }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const RECIPIENT = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const GNOT: Token = { id: 'ugnot', networkId: NETWORK.id, family: NETWORK.family, type: TokenType.NATIVE, name: 'Gno.land', symbol: 'GNOT', decimals: 6, denom: 'ugnot', isNative: true };
const ESTIMATE: FeeEstimate = { gasUsed: '100000', gasPrice: '0.001', denom: 'ugnot', policy: GNO_FEE_POLICY };

const deferred = <T,>(): { promise: Promise<T>; resolve: (value: T) => void } => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });

  return { promise, resolve };
};

const setup = async (prices?: Record<string, unknown>) => {
  jest.mocked(useWalletAssets).mockReturnValue({
    account: ACCOUNT,
    network: NETWORK,
    tokens: [],
    allTokens: [],
    assets: [{ token: GNOT, amount: '100000000', quantityLabel: '100 GNOT', trend: 'neutral', usdValue: null, loading: false }],
    portfolio: null,
    prices,
    error: null,
    loading: false,
    refreshing: false,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useWalletAssets>);
  const transactionService = {
    createTransferDraft: jest.fn(async ({ amount, memo }: { amount: string; memo: string }): Promise<TransactionDraft> => (
      { networkId: NETWORK.id, chainId: NETWORK.chainId, messages: [{ amount }], fee: { gasWanted: '0', gasFee: '' }, memo })),
    estimateFee: jest.fn(async () => ESTIMATE),
    maxTransferAmount: jest.fn(),
    assertSufficientFunds: jest.fn(async (..._args: unknown[]) => undefined),
    signAndBroadcast: jest.fn(async (_draft: TransactionDraft) => ({ hash: 'h', height: '1' })),
  };
  const { Wrapper } = createWrapper({
    transactionService,
    accountService: { getAccounts: () => [], getAddress: () => 'g1self' },
    addressBookService: { findByAddress: () => undefined },
  });
  const navigation = { goBack: jest.fn(), popToTop: jest.fn() };
  const route = { key: 'SendAmount', name: 'SendAmount', params: { toAddress: RECIPIENT } };
  const Screen = SendAmountScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper><Screen navigation={navigation} route={route} /></Wrapper>
    </SafeAreaProvider>,
  );

  return { transactionService, navigation };
};

describe('SendAmountScreen', () => {
  // Let query notifications scheduled on a timer land before the tree unmounts.
  afterEach(() => act(() => new Promise<void>((done) => {
    setTimeout(done, 0);
  })));

  it('drops an estimate that finishes after the amount was edited', async () => {
    const { transactionService } = await setup();
    const slow = deferred<FeeEstimate>();

    transactionService.estimateFee.mockImplementationOnce(() => slow.promise);
    await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
    await fireEvent.press(screen.getByTestId('send-review'));
    await fireEvent.press(screen.getByRole('keyboardkey', { name: '2' }));
    await act(async () => slow.resolve(ESTIMATE));

    expect(screen.queryByText('Confirm send')).toBeNull();

    await fireEvent.press(screen.getByTestId('send-review'));
    expect(await screen.findByText('12 GNOT')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('review-confirm'));

    expect(transactionService.signAndBroadcast).toHaveBeenCalledTimes(1);
    expect(transactionService.signAndBroadcast.mock.calls[0][0].messages).toEqual([{ amount: '12000000' }]);
    expect(transactionService.assertSufficientFunds.mock.calls[0][3]).toEqual({ token: GNOT, amount: '12000000' });
  });

  it('drops an estimate that finishes after the memo was edited', async () => {
    const { transactionService } = await setup();
    const slow = deferred<FeeEstimate>();

    transactionService.estimateFee.mockImplementationOnce(() => slow.promise);
    await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
    await fireEvent.press(screen.getByTestId('send-review'));
    await fireEvent.press(screen.getByRole('button', { name: 'Memo, Optional' }));
    await fireEvent.changeText(screen.getByLabelText('Memo (optional)'), 'invoice 7');
    await act(async () => slow.resolve(ESTIMATE));

    expect(screen.queryByText('Confirm send')).toBeNull();
  });

  it('shows fiat estimates from the cached prices and goes back to change the recipient', async () => {
    const { navigation } = await setup({ 'ugnot:gno-test': { tokenId: 'ugnot', networkId: NETWORK.id, usd: 2, change24h: null } });

    expect(screen.getByText('≈ $0.00')).toBeTruthy();
    await fireEvent.press(screen.getByRole('keyboardkey', { name: '3' }));
    expect(screen.getByText('≈ $6.00')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Recipient, g1jg...sqf5' }));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('send-review'));
    expect(await screen.findByText('3 GNOT')).toBeTruthy();
    expect(screen.getAllByText('≈ $6.00').length).toBeGreaterThan(1);
    expect(screen.getByText(/including network fee$/)).toBeTruthy();
  });

  it('broadcasts once when confirm is pressed twice before a re-render', async () => {
    const { transactionService, navigation } = await setup();

    await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
    await fireEvent.press(screen.getByTestId('send-review'));
    const confirm = await screen.findByTestId('review-confirm');
    const broadcast = deferred<{ hash: string; height: string }>();

    transactionService.signAndBroadcast.mockImplementationOnce(() => broadcast.promise);
    await fireEvent.press(confirm);
    await fireEvent.press(confirm);
    await act(async () => broadcast.resolve({ hash: 'h', height: '1' }));

    expect(transactionService.signAndBroadcast).toHaveBeenCalledTimes(1);
    expect(navigation.popToTop).toHaveBeenCalledTimes(1);
  });
});
