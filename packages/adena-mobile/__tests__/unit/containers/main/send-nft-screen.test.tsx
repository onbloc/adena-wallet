import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SendNftScreen } from '../../../../src/containers/main/send-nft-screen';
import { FeeEstimate, GNO_FEE_POLICY } from '../../../../src/domain/fee';
import { NftCollection, NftItem } from '../../../../src/domain/nft';
import { TransactionDraft } from '../../../../src/domain/transaction';
import { ACCOUNT, createWrapper, NETWORK } from '../../../helpers/query-wrapper';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const FIRST = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const SECOND = 'g1us8428u2a5satrlxzagqqa5m6vmuze025anjlj';
const ESTIMATE: FeeEstimate = { gasUsed: '100000', gasPrice: '0.001', denom: 'ugnot', policy: GNO_FEE_POLICY };
const COLLECTION: NftCollection = { id: 'c', packagePath: 'gno.land/r/demo/nft', name: 'Gnophers', symbol: 'GNO', ownedCount: 1, supportsTokenUri: false, supportsMetadata: false };
const ITEM: NftItem = { collectionId: 'c', packagePath: 'gno.land/r/demo/nft', nftId: '42', name: 'Gnopher', symbol: 'GNO' };

const deferred = <T,>(): { promise: Promise<T>; resolve: (value: T) => void } => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });

  return { promise, resolve };
};

const setup = async (extraParams: Record<string, unknown> = {}) => {
  const nftService = {
    createTransferDraft: jest.fn((_account: unknown, _network: unknown, _item: unknown, toAddress: string): TransactionDraft => (
      { networkId: NETWORK.id, chainId: NETWORK.chainId, messages: [{ toAddress }], fee: { gasWanted: '0', gasFee: '' }, memo: '' })),
    getTokenUri: jest.fn(),
  };
  const transactionService = {
    estimateFee: jest.fn(async () => ESTIMATE),
    assertSufficientFunds: jest.fn(async (..._args: unknown[]) => undefined),
    signAndBroadcast: jest.fn(async (_draft: TransactionDraft) => ({ hash: 'h', height: '1' })),
  };
  const { Wrapper } = createWrapper({
    nftService,
    transactionService,
    accountService: { getCurrentAccount: () => ACCOUNT, getAccounts: () => [ACCOUNT], getAddress: () => 'g1self' },
    networkService: { getCurrentNetwork: () => NETWORK, getNetworks: () => [NETWORK] },
    addressBookService: { getEntriesFor: () => [] },
    chainRegistry: { forNetwork: () => ({ isValidAddress: (value: string) => /^g1[a-z0-9]{38}$/.test(value) }) },
  });
  const navigation = { goBack: jest.fn(), popToTop: jest.fn(), navigate: jest.fn(), setParams: jest.fn() };
  const route = { key: 'SendNft', name: 'SendNft', params: { collection: COLLECTION, item: ITEM, ...extraParams } };
  const Screen = SendNftScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper><Screen navigation={navigation} route={route} /></Wrapper>
    </SafeAreaProvider>,
  );

  return { transactionService, navigation };
};

describe('SendNftScreen', () => {
  it('scans into the recipient field and consumes the scanned param', async () => {
    const { navigation } = await setup({ scannedAddress: FIRST });

    expect(screen.getByPlaceholderText('Recipient address').props.value).toBe(FIRST);
    expect(navigation.setParams).toHaveBeenCalledWith({ scannedAddress: undefined });
    await fireEvent.press(screen.getByRole('button', { name: 'Scan QR code' }));
    expect(navigation.navigate).toHaveBeenCalledWith('QrScanner', { returnKey: 'SendNft' });
  });

  // Let query notifications scheduled on a timer land before the tree unmounts.
  afterEach(() => act(() => new Promise<void>((done) => {
    setTimeout(done, 0);
  })));

  it('never reviews or signs a recipient that was replaced while estimating', async () => {
    const { transactionService } = await setup();
    const slow = deferred<FeeEstimate>();
    const field = screen.getByPlaceholderText('Recipient address');

    transactionService.estimateFee.mockImplementationOnce(() => slow.promise);
    await fireEvent.changeText(field, FIRST);
    await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
    await fireEvent.changeText(field, SECOND);
    await act(async () => slow.resolve(ESTIMATE));

    expect(screen.queryByText('Review NFT transfer')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
    expect(await screen.findByText(SECOND)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('review-confirm'));

    expect(transactionService.signAndBroadcast).toHaveBeenCalledTimes(1);
    expect(transactionService.signAndBroadcast.mock.calls[0][0].messages).toEqual([{ toAddress: SECOND }]);
  });

  it('broadcasts once when confirm is pressed twice before a re-render', async () => {
    const { transactionService, navigation } = await setup();

    await fireEvent.changeText(screen.getByPlaceholderText('Recipient address'), FIRST);
    await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
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
