import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SendAmountScreen } from '../../../../src/containers/main/send-amount-screen';
import { AppError, AppErrorCode, TransactionPendingError } from '../../../../src/core/errors';
import { FeeEstimate, GNO_FEE_POLICY } from '../../../../src/domain/fee';
import { Token, TokenType } from '../../../../src/domain/token';
import { BroadcastResult, SignedTransaction, SignerSequence, TransactionDraft, TransactionLookup } from '../../../../src/domain/transaction';
import {
  NOT_INCLUDED_MESSAGE,
  PENDING_NOTICE,
  PENDING_POLL_ATTEMPTS,
  PENDING_POLL_INTERVAL_MS,
  REPLACEABLE_NOTICE,
  UNCONFIRMED_NOTICE,
} from '../../../../src/hooks/use-pending-broadcast';
import { useWalletAssets } from '../../../../src/hooks/use-wallet-assets';
import { StorageKey } from '../../../../src/migration/storage-keys';
import { ChainRegistry } from '../../../../src/repositories/chain/chain-registry';
import { StoragePendingBroadcastRepository } from '../../../../src/repositories/pending-broadcast.repository';
import { AccountService } from '../../../../src/services/account.service';
import { KeyringSession } from '../../../../src/services/keyring-session';
import { PendingReconciliation, TransactionService } from '../../../../src/services/transaction.service';
import { writeJson } from '../../../../src/storage/key-value-store';
import { MemoryKeyValueStore } from '../../../../src/storage/memory-key-value-store';
import { usePendingBroadcastStore } from '../../../../src/stores/pending-broadcast.store';
import { useToastStore } from '../../../../src/stores/toast.store';
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

// Survives a simulated restart, which only resets the in-memory store.
let keyValueStore = new MemoryKeyValueStore();

const walletAssets = (network = NETWORK, prices?: Record<string, unknown>) => ({
  account: ACCOUNT,
  network,
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

const setup = async (prices?: Record<string, unknown>, params: Record<string, unknown> = {}) => {
  jest.mocked(useWalletAssets).mockReturnValue(walletAssets(NETWORK, prices));
  const transactionService = {
    createTransferDraft: jest.fn(async ({ amount, memo }: { amount: string; memo: string }): Promise<TransactionDraft> => (
      { networkId: NETWORK.id, chainId: NETWORK.chainId, messages: [{ amount }], fee: { gasWanted: '0', gasFee: '' }, memo })),
    estimateFee: jest.fn(async () => ESTIMATE),
    maxTransferAmount: jest.fn(),
    assertSufficientFunds: jest.fn(async (..._args: unknown[]) => undefined),
    signAndBroadcast: jest.fn(async (_draft: TransactionDraft, ..._rest: unknown[]): Promise<BroadcastResult> => ({ hash: 'h', height: '1', committed: true })),
    reconcilePending: jest.fn(async (..._args: unknown[]): Promise<PendingReconciliation> => ({ status: 'pending' })),
  };
  const { Wrapper } = createWrapper({
    transactionService,
    pendingBroadcastRepository: new StoragePendingBroadcastRepository(keyValueStore),
    accountService: { getAccounts: () => [], getAddress: () => 'g1self' },
    addressBookService: { findByAddress: () => undefined },
  });
  const navigation = { goBack: jest.fn(), popToTop: jest.fn() };
  const route = { key: 'SendAmount', name: 'SendAmount', params: { toAddress: RECIPIENT, ...params } };
  const Screen = SendAmountScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

  const tree = (): React.ReactElement => (
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper><Screen navigation={navigation} route={route} /></Wrapper>
    </SafeAreaProvider>
  );
  const { rerender } = await render(tree());

  return { transactionService, navigation, rerender: () => rerender(tree()) };
};

describe('SendAmountScreen', () => {
  beforeEach(() => {
    keyValueStore = new MemoryKeyValueStore();
    usePendingBroadcastStore.setState({ entries: {} });
  });

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

  it('keeps formatting the fee with the reviewed network after the current network changes', async () => {
    const { rerender } = await setup();

    await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
    await fireEvent.press(screen.getByTestId('send-review'));
    await screen.findByTestId('review-confirm');
    jest.mocked(useWalletAssets).mockReturnValue(walletAssets({ ...NETWORK, id: 'other', feeToken: { id: 'ufoo', symbol: 'FOO', denom: 'ufoo', decimals: 6 } }));
    await rerender();

    expect(screen.getByText(/^0\.\d+ GNOT$/)).toBeTruthy();
    expect(screen.queryByText(/ FOO$/)).toBeNull();
  });

  it('shows fiat estimates from the cached prices and goes back to change the recipient', async () => {
    const { navigation } = await setup({ 'ugnot:gno-test': { tokenId: 'ugnot', networkId: NETWORK.id, usd: 2, change24h: null } });

    expect(screen.getByText('≈ $0.00')).toBeTruthy();
    await fireEvent.press(screen.getByRole('keyboardkey', { name: '3' }));
    expect(screen.getByText('≈ $6.00')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Recipient, g1jg8m...fvsqf5' }));
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
    const broadcast = deferred<BroadcastResult>();

    transactionService.signAndBroadcast.mockImplementationOnce(() => broadcast.promise);
    await fireEvent.press(confirm);
    await fireEvent.press(confirm);
    await act(async () => broadcast.resolve({ hash: 'h', height: '1', committed: true }));

    expect(transactionService.signAndBroadcast).toHaveBeenCalledTimes(1);
    expect(navigation.popToTop).toHaveBeenCalledTimes(1);
  });

  const confirmOnce = async (transactionService: Awaited<ReturnType<typeof setup>>['transactionService'], error: unknown): Promise<void> => {
    transactionService.signAndBroadcast.mockRejectedValueOnce(error);
    await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
    await fireEvent.press(screen.getByTestId('send-review'));
    await fireEvent.press(await screen.findByTestId('review-confirm'));
  };

  describe('when the broadcast outcome is unknown', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('closes the review and blocks a re-send until the tx hash is found committed', async () => {
      const { transactionService, navigation } = await setup();

      await confirmOnce(transactionService, new TransactionPendingError('ABC'));

      expect(screen.queryByTestId('review-confirm')).toBeNull();
      expect(screen.getByText(PENDING_NOTICE)).toBeTruthy();
      await fireEvent.press(screen.getByTestId('send-review'));
      expect(transactionService.estimateFee).toHaveBeenCalledTimes(1);

      transactionService.reconcilePending.mockResolvedValueOnce({ status: 'pending' }).mockResolvedValueOnce({ status: 'committed', hash: 'ABC' });
      await act(() => jest.advanceTimersByTimeAsync(PENDING_POLL_INTERVAL_MS * 2));

      expect(transactionService.reconcilePending).toHaveBeenCalledWith(ACCOUNT, NETWORK);
      expect(transactionService.signAndBroadcast).toHaveBeenCalledTimes(1);
      expect(navigation.popToTop).toHaveBeenCalledTimes(1);
    });

    it('allows a retry once the tx is found failed', async () => {
      const { transactionService } = await setup();

      await confirmOnce(transactionService, new TransactionPendingError('ABC'));
      transactionService.reconcilePending.mockResolvedValueOnce({ status: 'failed', hash: 'ABC' });
      await act(() => jest.advanceTimersByTimeAsync(PENDING_POLL_INTERVAL_MS));

      expect(screen.queryByText(PENDING_NOTICE)).toBeNull();
      await fireEvent.press(screen.getByTestId('send-review'));
      expect(await screen.findByTestId('review-confirm')).toBeTruthy();
    });

    const exhaustPolling = async (): Promise<void> => {
      await act(() => jest.advanceTimersByTimeAsync(PENDING_POLL_INTERVAL_MS * PENDING_POLL_ATTEMPTS));
    };

    it('keeps blocking a new send after polling gives up', async () => {
      const { transactionService } = await setup();

      await confirmOnce(transactionService, new TransactionPendingError('ABC'));
      await exhaustPolling();

      expect(transactionService.reconcilePending).toHaveBeenCalledTimes(PENDING_POLL_ATTEMPTS);
      expect(screen.getByText(UNCONFIRMED_NOTICE)).toBeTruthy();
      await fireEvent.press(screen.getByTestId('send-review'));
      expect(transactionService.estimateFee).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('review-confirm')).toBeNull();
      expect(transactionService.signAndBroadcast).toHaveBeenCalledTimes(1);
    });

    it('keeps the block across leaving and reopening the screen, and rechecks on reopen', async () => {
      const first = await setup();

      await confirmOnce(first.transactionService, new TransactionPendingError('ABC'));
      await exhaustPolling();
      await screen.unmount();

      const { transactionService, navigation } = await setup();

      expect(screen.getByText(PENDING_NOTICE)).toBeTruthy();
      await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
      await fireEvent.press(screen.getByTestId('send-review'));
      expect(transactionService.estimateFee).not.toHaveBeenCalled();

      transactionService.reconcilePending.mockResolvedValueOnce({ status: 'committed', hash: 'ABC' });
      await act(() => jest.advanceTimersByTimeAsync(PENDING_POLL_INTERVAL_MS));

      expect(transactionService.reconcilePending).toHaveBeenCalledWith(ACCOUNT, NETWORK);
      expect(usePendingBroadcastStore.getState().entries).toEqual({});
      // This screen did not send it, so it only reports the outcome.
      expect(navigation.popToTop).not.toHaveBeenCalled();
      expect(useToastStore.getState().toast?.message).toBe('Your previous transaction was confirmed.');
      await fireEvent.press(screen.getByTestId('send-review'));
      expect(await screen.findByTestId('review-confirm')).toBeTruthy();
    });

    it('allows a new send once a recheck finds the tx failed', async () => {
      const first = await setup();

      await confirmOnce(first.transactionService, new TransactionPendingError('ABC'));
      await exhaustPolling();
      await screen.unmount();

      const { transactionService } = await setup();

      transactionService.reconcilePending.mockResolvedValueOnce({ status: 'pending' }).mockResolvedValueOnce({ status: 'failed', hash: 'ABC' });
      await act(() => jest.advanceTimersByTimeAsync(PENDING_POLL_INTERVAL_MS * 2));

      expect(screen.queryByText(PENDING_NOTICE)).toBeNull();
      await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
      await fireEvent.press(screen.getByTestId('send-review'));
      expect(await screen.findByTestId('review-confirm')).toBeTruthy();
    });

    const restart = async (): Promise<void> => {
      await screen.unmount();
      usePendingBroadcastStore.setState({ entries: {} });
    };

    it('keeps a re-send blocked after an app restart until the persisted hash is found committed', async () => {
      const first = await setup();
      const repository = new StoragePendingBroadcastRepository(keyValueStore);

      await confirmOnce(first.transactionService, new TransactionPendingError('ABC'));
      expect(repository.get(ACCOUNT.id, NETWORK.chainId)).toMatchObject({ hashes: ['ABC'], accountId: ACCOUNT.id, chainId: NETWORK.chainId });
      await restart();

      const { transactionService, navigation } = await setup();

      expect(screen.getByText(PENDING_NOTICE)).toBeTruthy();
      await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
      await fireEvent.press(screen.getByTestId('send-review'));
      expect(transactionService.estimateFee).not.toHaveBeenCalled();

      transactionService.reconcilePending.mockResolvedValueOnce({ status: 'pending' }).mockResolvedValueOnce({ status: 'committed', hash: 'ABC' });
      await act(() => jest.advanceTimersByTimeAsync(PENDING_POLL_INTERVAL_MS * 2));

      expect(transactionService.reconcilePending).toHaveBeenCalledWith(ACCOUNT, NETWORK);
      expect(repository.get(ACCOUNT.id, NETWORK.chainId)).toBeUndefined();
      expect(navigation.popToTop).not.toHaveBeenCalled();
      expect(useToastStore.getState().toast?.message).toBe('Your previous transaction was confirmed.');
      await fireEvent.press(screen.getByTestId('send-review'));
      expect(await screen.findByTestId('review-confirm')).toBeTruthy();
    });

    // The app is killed before the broadcast responds, so the screen never sees an error to track.
    it('keeps a re-send blocked after a restart while the broadcast response is still pending', async () => {
      const first = await setup();
      const response = deferred<BroadcastResult>();
      const chain = {
        signTransaction: async () => ({ encoded: 'AAAA' }),
        transactionHash: () => 'SIGNED',
        broadcastTransaction: jest.fn(() => response.promise),
      };
      const real = new TransactionService(
        { forNetwork: () => chain } as unknown as ChainRegistry,
        {} as AccountService,
        { withKeyPair: (_id: string, _index: number, task: (key: unknown) => unknown) => task({}) } as unknown as KeyringSession,
        new StoragePendingBroadcastRepository(keyValueStore),
      );

      first.transactionService.signAndBroadcast.mockImplementationOnce(draft => real.signAndBroadcast(draft, ACCOUNT, NETWORK));
      await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
      await fireEvent.press(screen.getByTestId('send-review'));
      await fireEvent.press(await screen.findByTestId('review-confirm'));
      expect(chain.broadcastTransaction).toHaveBeenCalledTimes(1);
      await restart();

      const { transactionService, navigation } = await setup();

      expect(screen.getByText(PENDING_NOTICE)).toBeTruthy();
      await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
      await fireEvent.press(screen.getByTestId('send-review'));
      expect(transactionService.estimateFee).not.toHaveBeenCalled();
      expect(screen.queryByTestId('review-confirm')).toBeNull();

      transactionService.reconcilePending.mockResolvedValueOnce({ status: 'pending' }).mockResolvedValueOnce({ status: 'committed', hash: 'SIGNED' });
      await act(() => jest.advanceTimersByTimeAsync(PENDING_POLL_INTERVAL_MS * 2));

      expect(transactionService.reconcilePending).toHaveBeenCalledWith(ACCOUNT, NETWORK);
      expect(new StoragePendingBroadcastRepository(keyValueStore).get(ACCOUNT.id, NETWORK.chainId)).toBeUndefined();
      expect(navigation.popToTop).not.toHaveBeenCalled();
      await fireEvent.press(screen.getByTestId('send-review'));
      expect(await screen.findByTestId('review-confirm')).toBeTruthy();

      // Settle the call left over from before the restart so nothing stays open.
      await act(async () => response.resolve({ hash: 'SIGNED', height: '1', committed: true }));
    });

    it('unblocks after a restart once the persisted hash is found failed', async () => {
      const first = await setup();

      await confirmOnce(first.transactionService, new TransactionPendingError('ABC'));
      await exhaustPolling();
      await restart();

      const { transactionService } = await setup();

      expect(screen.getByText(PENDING_NOTICE)).toBeTruthy();
      transactionService.reconcilePending.mockResolvedValueOnce({ status: 'failed', hash: 'ABC' });
      await act(() => jest.advanceTimersByTimeAsync(PENDING_POLL_INTERVAL_MS));

      expect(new StoragePendingBroadcastRepository(keyValueStore).get(ACCOUNT.id, NETWORK.chainId)).toBeUndefined();
      expect(screen.queryByText(PENDING_NOTICE)).toBeNull();
      await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
      await fireEvent.press(screen.getByTestId('send-review'));
      expect(await screen.findByTestId('review-confirm')).toBeTruthy();
    });

    // A real TransactionService over a fake chain whose first broadcast never returns (the app is killed).
    const realService = () => {
      const state = { sequence: '3', found: null as TransactionLookup, accountError: null as Error | null };
      const chain = {
        signTransaction: jest.fn(async (draft: TransactionDraft, _key: unknown, _network: unknown, pin?: SignerSequence): Promise<SignedTransaction> => {
          if (pin && pin.sequence !== state.sequence) {
            throw new AppError(AppErrorCode.PREVIOUS_TRANSACTION_PENDING, 'moved');
          }

          return { encoded: `${(draft.messages[0] as { amount: string }).amount}@${state.sequence}`, sequence: state.sequence, accountNumber: '7' };
        }),
        transactionHash: (signed: SignedTransaction) => `H:${signed.encoded}`,
        broadcastTransaction: jest.fn((): Promise<BroadcastResult> => new Promise<never>(() => undefined)),
        findTransaction: jest.fn(async () => state.found),
        getAccountSequence: jest.fn(async () => {
          if (state.accountError) {
            throw state.accountError;
          }

          return state.sequence;
        }),
      };
      const service = new TransactionService(
        { forNetwork: () => chain } as unknown as ChainRegistry,
        { getAddress: () => 'g1self' } as unknown as AccountService,
        { withKeyPair: (_id: string, _index: number, task: (key: unknown) => unknown) => task({}) } as unknown as KeyringSession,
        new StoragePendingBroadcastRepository(keyValueStore),
      );

      return { state, chain, service };
    };

    const delegateTo = (mock: Awaited<ReturnType<typeof setup>>['transactionService'], service: TransactionService): void => {
      mock.signAndBroadcast.mockImplementation((draft, _account, _network, options) => service.signAndBroadcast(draft, ACCOUNT, NETWORK, options as never));
      mock.reconcilePending.mockImplementation(() => service.reconcilePending(ACCOUNT, NETWORK));
    };

    const killedBeforeBroadcast = async () => {
      const first = await setup();
      const real = realService();

      delegateTo(first.transactionService, real.service);
      await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
      await fireEvent.press(screen.getByTestId('send-review'));
      await fireEvent.press(await screen.findByTestId('review-confirm'));
      expect(real.chain.broadcastTransaction).toHaveBeenCalledTimes(1);
      await restart();

      const second = await setup();

      delegateTo(second.transactionService, real.service);
      return { ...second, ...real };
    };

    it('allows only a pinned resend after a restart while the sequence is unchanged', async () => {
      const { chain, transactionService } = await killedBeforeBroadcast();

      expect(screen.getByText(PENDING_NOTICE)).toBeTruthy();
      await act(() => jest.advanceTimersByTimeAsync(PENDING_POLL_INTERVAL_MS));
      expect(screen.getByText(REPLACEABLE_NOTICE)).toBeTruthy();

      chain.broadcastTransaction.mockResolvedValueOnce({ hash: 'H:2000000@3', height: '9', committed: true });
      await fireEvent.press(screen.getByRole('keyboardkey', { name: '2' }));
      await fireEvent.press(screen.getByTestId('send-review'));
      await fireEvent.press(await screen.findByTestId('review-confirm'));

      expect(transactionService.signAndBroadcast.mock.calls[0][3]).toEqual({ replacePending: true });
      expect(chain.signTransaction).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), NETWORK, { sequence: '3', accountNumber: '7' });
      expect(chain.broadcastTransaction).toHaveBeenCalledTimes(2);
      expect(new StoragePendingBroadcastRepository(keyValueStore).get(ACCOUNT.id, NETWORK.chainId)).toBeUndefined();
    });

    it('clears the block and allows a normal send once the sequence advanced without the tx', async () => {
      const { state, chain, transactionService } = await killedBeforeBroadcast();

      state.sequence = '4';
      await act(() => jest.advanceTimersByTimeAsync(PENDING_POLL_INTERVAL_MS));

      expect(useToastStore.getState().toast?.message).toBe(NOT_INCLUDED_MESSAGE);
      expect(screen.queryByText(PENDING_NOTICE)).toBeNull();
      chain.broadcastTransaction.mockResolvedValueOnce({ hash: 'h', height: '9', committed: true });
      await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
      await fireEvent.press(screen.getByTestId('send-review'));
      await fireEvent.press(await screen.findByTestId('review-confirm'));
      expect(transactionService.signAndBroadcast.mock.calls[0][3]).toEqual({ replacePending: false });
      expect(chain.signTransaction).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), NETWORK, undefined);
    });

    it('stays blocked while the reconcile lookups fail', async () => {
      const { state, transactionService } = await killedBeforeBroadcast();

      state.sequence = '4';
      state.accountError = new Error('socket hang up');
      await exhaustPolling();

      expect(screen.getByText(UNCONFIRMED_NOTICE)).toBeTruthy();
      await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
      await fireEvent.press(screen.getByTestId('send-review'));
      expect(transactionService.estimateFee).not.toHaveBeenCalled();
      expect(new StoragePendingBroadcastRepository(keyValueStore).get(ACCOUNT.id, NETWORK.chainId)).toBeDefined();
    });

    it('reports a committed original as confirmed after a restart', async () => {
      const { state, navigation } = await killedBeforeBroadcast();

      state.found = 'committed';
      await act(() => jest.advanceTimersByTimeAsync(PENDING_POLL_INTERVAL_MS));

      expect(useToastStore.getState().toast?.message).toBe('Your previous transaction was confirmed.');
      expect(navigation.popToTop).not.toHaveBeenCalled();
      expect(new StoragePendingBroadcastRepository(keyValueStore).get(ACCOUNT.id, NETWORK.chainId)).toBeUndefined();
    });

    it('waits for a tx the node only accepted into the mempool instead of reporting it confirmed', async () => {
      const { transactionService, navigation } = await setup();

      transactionService.signAndBroadcast.mockResolvedValueOnce({ hash: 'SYNC', height: '0', committed: false });
      await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
      await fireEvent.press(screen.getByTestId('send-review'));
      await fireEvent.press(await screen.findByTestId('review-confirm'));

      expect(navigation.popToTop).not.toHaveBeenCalled();
      expect(useToastStore.getState().toast?.message).toBe('Transaction sent. Waiting for confirmation.');
      expect(screen.queryByTestId('review-confirm')).toBeNull();
      expect(screen.getByText(PENDING_NOTICE)).toBeTruthy();
      expect(new StoragePendingBroadcastRepository(keyValueStore).get(ACCOUNT.id, NETWORK.chainId)?.hashes).toEqual(['SYNC']);

      transactionService.reconcilePending.mockResolvedValueOnce({ status: 'committed', hash: 'SYNC' });
      await act(() => jest.advanceTimersByTimeAsync(PENDING_POLL_INTERVAL_MS));

      expect(navigation.popToTop).toHaveBeenCalledTimes(1);
      expect(useToastStore.getState().toast?.message).toBe('Transaction confirmed');
    });

    it('is blocked by a record of the previous version written for another network of the same chain', async () => {
      writeJson(keyValueStore, StorageKey.PENDING_BROADCASTS, {
        legacy: { hash: 'OLD', accountId: ACCOUNT.id, networkId: `custom:${NETWORK.chainId}:http://localhost:26657`, createdAt: 0 },
      });
      const { transactionService } = await setup();

      expect(screen.getByText(PENDING_NOTICE)).toBeTruthy();
      await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
      await fireEvent.press(screen.getByTestId('send-review'));
      expect(transactionService.estimateFee).not.toHaveBeenCalled();
    });

    it('is not blocked by a pending tx of another account or chain', async () => {
      const repository = new StoragePendingBroadcastRepository(keyValueStore);

      repository.save({ hashes: ['OTHER-ACCOUNT'], accountId: 'acc-2', chainId: NETWORK.chainId, createdAt: 0 });
      repository.save({ hashes: ['OTHER-CHAIN'], accountId: ACCOUNT.id, chainId: 'other-chain', createdAt: 0 });
      const { transactionService } = await setup();

      expect(screen.queryByText(PENDING_NOTICE)).toBeNull();
      await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
      await fireEvent.press(screen.getByTestId('send-review'));
      expect(await screen.findByTestId('review-confirm')).toBeTruthy();
      await act(() => jest.advanceTimersByTimeAsync(PENDING_POLL_INTERVAL_MS));
      expect(transactionService.reconcilePending).not.toHaveBeenCalled();
    });
  });

  it('keeps the review open for a definitive rejection so the user can retry', async () => {
    const { transactionService } = await setup();

    await confirmOnce(transactionService, new AppError(AppErrorCode.TRANSACTION_FAILED, 'insufficient funds'));

    expect(await screen.findByText('insufficient funds')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('review-confirm'));
    expect(transactionService.signAndBroadcast).toHaveBeenCalledTimes(2);
  });

  it('reports a requested token that is not listed instead of sending the native coin', async () => {
    const { transactionService } = await setup(undefined, { tokenId: 'gno.land/r/demo/hidden' });

    expect(screen.getByText(/This token isn’t in your token list/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('keyboardkey', { name: '1' }));
    await fireEvent.press(screen.getByTestId('send-review'));
    expect(transactionService.createTransferDraft).not.toHaveBeenCalled();
  });
});
