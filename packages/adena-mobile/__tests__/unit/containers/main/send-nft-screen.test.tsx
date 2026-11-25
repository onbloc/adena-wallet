import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SendNftScreen } from '../../../../src/containers/main/send-nft-screen';
import { TransactionPendingError } from '../../../../src/core/errors';
import { FeeEstimate, GNO_FEE_POLICY } from '../../../../src/domain/fee';
import { NftCollection, NftItem } from '../../../../src/domain/nft';
import { BroadcastResult, TransactionDraft } from '../../../../src/domain/transaction';
import { PENDING_NOTICE, PENDING_POLL_INTERVAL_MS, REPLACEABLE_NOTICE } from '../../../../src/hooks/use-pending-broadcast';
import { StoragePendingBroadcastRepository } from '../../../../src/repositories/pending-broadcast.repository';
import { PendingReconciliation } from '../../../../src/services/transaction.service';
import { MemoryKeyValueStore } from '../../../../src/storage/memory-key-value-store';
import { usePendingBroadcastStore } from '../../../../src/stores/pending-broadcast.store';
import { useToastStore } from '../../../../src/stores/toast.store';
import { normalizeAddress } from '../../../../src/utils/address';
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

const setup = async (extraParams: Record<string, unknown> = {}, ownAddress = 'g1self') => {
  const nftService = {
    createTransferDraft: jest.fn((_account: unknown, _network: unknown, _item: unknown, toAddress: string): TransactionDraft => (
      { networkId: NETWORK.id, chainId: NETWORK.chainId, messages: [{ toAddress }], fee: { gasWanted: '0', gasFee: '' }, memo: '' })),
    getTokenUri: jest.fn(),
  };
  const transactionService = {
    estimateFee: jest.fn(async () => ESTIMATE),
    assertSufficientFunds: jest.fn(async (..._args: unknown[]) => undefined),
    signAndBroadcast: jest.fn(async (_draft: TransactionDraft, ..._rest: unknown[]): Promise<BroadcastResult> => ({ hash: 'h', height: '1', committed: true })),
    reconcilePending: jest.fn(async (..._args: unknown[]): Promise<PendingReconciliation> => ({ status: 'pending' })),
  };
  const { Wrapper } = createWrapper({
    nftService,
    transactionService,
    pendingBroadcastRepository: new StoragePendingBroadcastRepository(new MemoryKeyValueStore()),
    accountService: { getCurrentAccount: () => ACCOUNT, getAccounts: () => [ACCOUNT], getAddress: () => ownAddress },
    networkService: { getCurrentNetwork: () => NETWORK, getNetworks: () => [NETWORK] },
    addressBookService: { getEntriesFor: () => [] },
    chainRegistry: { forNetwork: () => ({ normalizeAddress: (value: string) => normalizeAddress(value, 'g') }) },
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
  beforeEach(() => usePendingBroadcastStore.setState({ entries: {} }));

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
    const broadcast = deferred<BroadcastResult>();

    transactionService.signAndBroadcast.mockImplementationOnce(() => broadcast.promise);
    await fireEvent.press(confirm);
    await fireEvent.press(confirm);
    await act(async () => broadcast.resolve({ hash: 'h', height: '1', committed: true }));

    expect(transactionService.signAndBroadcast).toHaveBeenCalledTimes(1);
    expect(navigation.popToTop).toHaveBeenCalledTimes(1);
  });

  it('normalizes an uppercase recipient so the self-send check still applies', async () => {
    await setup({}, FIRST);

    await fireEvent.changeText(screen.getByPlaceholderText('Recipient address'), FIRST.toUpperCase());

    expect(screen.getByText('This is your current account.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review transfer' }).props.accessibilityState?.disabled).toBe(true);
  });

  it('signs the canonical lowercase recipient', async () => {
    const { transactionService } = await setup();

    await fireEvent.changeText(screen.getByPlaceholderText('Recipient address'), FIRST.toUpperCase());
    await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
    await fireEvent.press(await screen.findByTestId('review-confirm'));

    expect(transactionService.signAndBroadcast.mock.calls[0][0].messages).toEqual([{ toAddress: FIRST }]);
  });

  it('checks funds including the storage deposit and shows it in the review', async () => {
    const { transactionService } = await setup();

    transactionService.estimateFee.mockResolvedValueOnce({ ...ESTIMATE, storageDeposit: '2500000' });
    await fireEvent.changeText(screen.getByPlaceholderText('Recipient address'), FIRST);
    await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));

    expect(await screen.findByText('Storage deposit')).toBeTruthy();
    expect(screen.getByText('2.5 GNOT')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('review-confirm'));
    expect(transactionService.assertSufficientFunds.mock.calls[0][4]).toBe('2500000');
  });

  describe('when the broadcast outcome is unknown', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('closes the review and blocks a re-send until the tx hash is found committed', async () => {
      const { transactionService, navigation } = await setup();

      transactionService.signAndBroadcast.mockRejectedValueOnce(new TransactionPendingError('ABC'));
      await fireEvent.changeText(screen.getByPlaceholderText('Recipient address'), FIRST);
      await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
      await fireEvent.press(await screen.findByTestId('review-confirm'));
      // Let the sheet's exit animation finish (well before the first poll).
      await act(() => jest.advanceTimersByTimeAsync(500));

      expect(screen.queryByTestId('review-confirm')).toBeNull();
      expect(screen.getByText(PENDING_NOTICE)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Review transfer' }).props.accessibilityState?.disabled).toBe(true);

      transactionService.reconcilePending.mockResolvedValueOnce({ status: 'committed', hash: 'ABC' });
      await act(() => jest.advanceTimersByTimeAsync(PENDING_POLL_INTERVAL_MS));

      expect(transactionService.signAndBroadcast).toHaveBeenCalledTimes(1);
      expect(navigation.popToTop).toHaveBeenCalledTimes(1);
    });

    it('waits for a tx only accepted into the mempool, then reports it once committed', async () => {
      const { transactionService, navigation } = await setup();

      transactionService.signAndBroadcast.mockResolvedValueOnce({ hash: 'SYNC', height: '0', committed: false });
      await fireEvent.changeText(screen.getByPlaceholderText('Recipient address'), FIRST);
      await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
      await fireEvent.press(await screen.findByTestId('review-confirm'));
      await act(() => jest.advanceTimersByTimeAsync(500));

      expect(navigation.popToTop).not.toHaveBeenCalled();
      expect(useToastStore.getState().toast?.message).toBe('Transaction sent. Waiting for confirmation.');
      expect(screen.getByText(PENDING_NOTICE)).toBeTruthy();

      transactionService.reconcilePending.mockResolvedValueOnce({ status: 'committed', hash: 'SYNC' });
      await act(() => jest.advanceTimersByTimeAsync(PENDING_POLL_INTERVAL_MS));

      expect(navigation.popToTop).toHaveBeenCalledTimes(1);
      expect(useToastStore.getState().toast?.message).toBe('NFT sent');
    });

    it('sends a replacement through the pinned path while the previous tx is replaceable', async () => {
      const { transactionService } = await setup();

      transactionService.signAndBroadcast.mockRejectedValueOnce(new TransactionPendingError('ABC'));
      await fireEvent.changeText(screen.getByPlaceholderText('Recipient address'), FIRST);
      await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
      await fireEvent.press(await screen.findByTestId('review-confirm'));
      await act(() => jest.advanceTimersByTimeAsync(500));

      transactionService.reconcilePending.mockResolvedValue({ status: 'replaceable', sequence: '3' });
      await act(() => jest.advanceTimersByTimeAsync(PENDING_POLL_INTERVAL_MS));
      expect(screen.getByText(REPLACEABLE_NOTICE)).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
      await fireEvent.press(await screen.findByTestId('review-confirm'));
      expect(transactionService.signAndBroadcast).toHaveBeenCalledTimes(2);
      expect(transactionService.signAndBroadcast.mock.calls[1][3]).toEqual({ replacePending: true });
    });
  });
});
