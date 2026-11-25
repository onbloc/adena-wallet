import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { percentOfBalance, searchSwapTokens, sortSwapTokens, SwapScreen } from '../../../../src/containers/main/swap-screen';
import { AppError, AppErrorCode } from '../../../../src/core/errors';
import { GNO_FEE_POLICY } from '../../../../src/domain/fee';
import { SwapToken } from '../../../../src/domain/swap';
import { PENDING_NOTICE, PENDING_POLL_INTERVAL_MS, REPLACEABLE_NOTICE } from '../../../../src/hooks/use-pending-broadcast';
import { queryKeys } from '../../../../src/queries/query-keys';
import { SWAP_QUOTE_TTL_MS, SwapMaxResult } from '../../../../src/services/swap.service';
import { PREVIOUS_TRANSACTION_RESOLVED_MESSAGE } from '../../../../src/services/transaction.service';
import { useSessionStore } from '../../../../src/stores/session.store';
import { GnoswapFakeOptions, GNS, installGnoswapFakes, qeval } from '../../../helpers/gnoswap-fakes';
import { renderScreen, resetStores, setupWallet, toastMessage } from '../../../helpers/render-screen';
import { createTestContainer } from '../../../helpers/test-container';

const LOOKUP = { timeout: 3000 };

const press = async (label: string): Promise<void> => {
  await fireEvent.press(screen.getByRole('button', { name: label }));
};

const typeAmount = async (digits: string): Promise<void> => {
  for (const digit of digits) {
    await fireEvent.press(screen.getByRole('keyboardkey', { name: digit === '.' ? 'Decimal point' : digit }));
  }
};

type Wallet = Awaited<ReturnType<typeof setupWallet>>;

const setup = async (options: GnoswapFakeOptions = {}, networkId?: string, beforeRender?: (wallet: Wallet) => void) => {
  const env = createTestContainer();
  const fakes = installGnoswapFakes(env, { grc20Balances: { [GNS]: '5000000' }, ...options });
  const wallet = await setupWallet(env);

  env.gno.state.balances[wallet.address] = '100000000ugnot';

  if (networkId) {
    env.container.networkService.selectNetwork(networkId);
  }

  beforeRender?.(wallet);

  const rendered = await renderScreen(SwapScreen, { env });

  return { ...wallet, ...fakes, ...rendered };
};

const pickGns = async (): Promise<void> => {
  await fireEvent.press(await screen.findByRole('button', { name: 'Buy GNS' }, LOOKUP));
};

describe('SwapScreen', () => {
  beforeEach(resetStores);

  afterEach(() => act(() => new Promise<void>((done) => {
    setTimeout(done, 0);
  })));

  it('docks four equal-width percentage chips above the keypad', async () => {
    await setup();
    await screen.findByText('Balance 100', undefined, LOOKUP);
    const labels = ['25%', '50%', '75%', 'Max'];

    labels.forEach(label => expect(screen.getByRole('button', { name: label }).props.accessibilityState).toMatchObject({ disabled: false }));
    expect(new Set(labels.map(label => JSON.stringify(screen.getByRole('button', { name: label }).props.style)))).toHaveProperty('size', 1);
  });

  it('starts with GNOT to sell and asks for a token to buy', async () => {
    await setup();

    expect(await screen.findByText('Balance 100', undefined, LOOKUP)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Token to sell, GNOT' })).toBeTruthy();
    expect(screen.getByTestId('swap-select-buy')).toBeTruthy();
    expect(screen.getByText('Select a token')).toBeTruthy();
  });

  it('quotes through the router dry run and enables review', async () => {
    const { dryExpressions } = await setup();

    await pickGns();
    expect(screen.getByText('Enter an amount')).toBeTruthy();
    await typeAmount('1');
    expect(await screen.findByText('4.15136', undefined, LOOKUP)).toBeTruthy();
    expect(screen.getByText('Review swap')).toBeTruthy();
    expect(dryExpressions).toHaveLength(1);
    expect(screen.getByText(/^1 GNOT = 4\.15136 GNS/)).toBeTruthy();
  });

  it('flags an amount above the balance', async () => {
    await setup();

    await pickGns();
    await typeAmount('200');
    expect(await screen.findByText('Not enough GNOT', undefined, LOOKUP)).toBeTruthy();
    expect(screen.getByTestId('swap-sell-balance').props.children).toBe('Balance 100');
  });

  it('falls back to the bundled reserve without a token to buy and says the max is approximate', async () => {
    await setup();
    await screen.findByText('Balance 100', undefined, LOOKUP);

    await press('50%');
    expect(await screen.findByText('50', undefined, LOOKUP)).toBeTruthy();
    expect(screen.queryByText(/amount is approximate/)).toBeNull();
    await press('Max');
    // 100 GNOT minus the 1 GNOT fallback reserve from dex-apis.json.
    expect(await screen.findByText('99', undefined, LOOKUP)).toBeTruthy();
    expect(screen.getByText(/1 GNOT is kept back\. The amount is approximate\./)).toBeTruthy();
  });

  it('sizes the native Max from the simulated swap fee and storage deposit', async () => {
    const { env } = await setup();
    const estimateFee = jest.spyOn(env.container.transactionService, 'estimateFee')
      .mockResolvedValue({ gasUsed: '1000000', gasPrice: '0.001', denom: 'ugnot', policy: GNO_FEE_POLICY, storageDeposit: '2500000' });

    await pickGns();
    await press('Max');
    // 100 GNOT - 1,320 ugnot (fee x1.2) - 2.5 GNOT deposit.
    expect(await screen.findByText('97.49868', undefined, LOOKUP)).toBeTruthy();
    expect(estimateFee).toHaveBeenCalledTimes(1);
    // A lower share stays below the cap and reuses the cached estimate.
    await press('25%');
    expect(screen.getByText('25')).toBeTruthy();
    expect(estimateFee).toHaveBeenCalledTimes(1);
  });

  it('shows the fee message when the fee exceeds the balance', async () => {
    const { env, address } = await setup();

    env.gno.state.balances[address] = '1500ugnot';
    jest.spyOn(env.container.transactionService, 'estimateFee')
      .mockResolvedValue({ gasUsed: '1000000', gasPrice: '0.001', denom: 'ugnot', policy: GNO_FEE_POLICY });
    await pickGns();
    await screen.findByText('Balance 0.0015', undefined, LOOKUP);
    await press('Max');
    expect(await screen.findByText('Insufficient GNOT for the network fee', undefined, LOOKUP)).toBeTruthy();
  });

  it('ignores a max estimate that lands after the amount was edited', async () => {
    const { env } = await setup();
    let resolve!: (value: SwapMaxResult) => void;

    jest.spyOn(env.container.swapService, 'maxInputAmount').mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    await pickGns();
    await press('Max');
    expect(screen.getByRole('button', { name: 'Max' }).props.accessibilityState).toMatchObject({ busy: true });
    await typeAmount('5');
    await act(async () => resolve({ amount: '97000000', approximate: false }));
    expect(within(screen.getByTestId('swap-sell')).getByText('5')).toBeTruthy();
    expect(screen.queryByText('97')).toBeNull();
    expect(screen.getByRole('button', { name: 'Max' }).props.accessibilityState).toMatchObject({ busy: false });
  });

  it('flips the tokens and keeps the typed amount with its token, like Uniswap', async () => {
    const { routeBodies } = await setup();

    await pickGns();
    await typeAmount('1');
    await screen.findByText('4.15136', undefined, LOOKUP);
    await press('Switch tokens');
    expect(screen.getByRole('button', { name: 'Token to sell, GNS' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Token to buy, GNOT' })).toBeTruthy();
    // The typed 1 GNOT is now the exact output; the GNS to sell is quoted.
    expect(screen.getByRole('button', { name: 'Buy amount' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(within(screen.getByTestId('swap-buy')).getByText('1')).toBeTruthy();
    await waitFor(() => expect(routeBodies.at(-1)).toMatchObject({ exactType: 'EXACT_OUT', amount: '1000000', outputTokenPath: 'gno.land/r/gnoland/wugnot.wugnot' }), LOOKUP);
  });

  it('quotes the input when the buy card is typed and reviews with max sent', async () => {
    const { routeBodies, dryExpressions } = await setup();

    await pickGns();
    await fireEvent.press(screen.getByRole('button', { name: 'Buy amount' }));
    expect(screen.getByRole('button', { name: 'Buy amount' }).props.accessibilityState).toMatchObject({ selected: true });
    await typeAmount('4');
    expect(await within(screen.getByTestId('swap-sell')).findByText('0.962929', undefined, LOOKUP)).toBeTruthy();
    expect(routeBodies.at(-1)).toEqual({ inputTokenPath: 'gno.land/r/gnoland/wugnot.wugnot', outputTokenPath: GNS, exactType: 'EXACT_OUT', amount: '4000000' });
    expect(dryExpressions.at(-1)).toContain('"4000000", "EXACT_OUT"');
    await fireEvent.press(screen.getByTestId('swap-details-toggle'));
    expect(screen.getByText('Max. sent')).toBeTruthy();

    await press('Review swap');
    expect(await screen.findByText('Confirm swap', undefined, LOOKUP)).toBeTruthy();
    expect(screen.getByText('You pay (max)')).toBeTruthy();
    expect(screen.getByText('You receive (exact)')).toBeTruthy();
    // ceil(962,929 x 1.005) = 967,744.
    expect(screen.getAllByText('0.967744 GNOT').length).toBeGreaterThan(0);
    expect(screen.getByText(/is wrapped for the swap; what it doesn’t use stays in your wallet as wugnot/)).toBeTruthy();
  });

  it('checks the balance against amountInMax for an exact output', async () => {
    const { env, address } = await setup();

    env.gno.state.balances[address] = '965000ugnot';
    await pickGns();
    await screen.findByText('Balance 0.965', undefined, LOOKUP);
    await fireEvent.press(screen.getByRole('button', { name: 'Buy amount' }));
    await typeAmount('4');
    // 962,929 quoted fits, but the 967,744 maximum does not.
    expect(await screen.findByText('Not enough GNOT', undefined, LOOKUP)).toBeTruthy();
  });

  it('switches back to an exact input when a percentage chip is used', async () => {
    await setup();

    await pickGns();
    await fireEvent.press(screen.getByRole('button', { name: 'Buy amount' }));
    await typeAmount('4');
    await within(screen.getByTestId('swap-sell')).findByText('0.962929', undefined, LOOKUP);
    await press('Max');
    // Balance minus the simulated fee x1.2 of the fake node (no storage deposit).
    expect(await within(screen.getByTestId('swap-sell')).findByText(/^99\.9998/, undefined, LOOKUP)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sell amount' }).props.accessibilityState).toMatchObject({ selected: true });
  });

  it('keeps the shown estimate when focus moves to the other card', async () => {
    await setup();

    await pickGns();
    await typeAmount('1');
    await screen.findByText('4.15136', undefined, LOOKUP);
    await fireEvent.press(screen.getByRole('button', { name: 'Buy amount' }));
    expect(within(screen.getByTestId('swap-buy')).getByText('4.151365')).toBeTruthy();
    await fireEvent.press(screen.getByRole('keyboardkey', { name: 'Delete' }));
    expect(within(screen.getByTestId('swap-buy')).getByText('4.15136')).toBeTruthy();
  });

  it('searches the token selector by symbol and package path', async () => {
    await setup();
    await screen.findByText('Balance 100', undefined, LOOKUP);

    await press('Token to sell, GNOT');
    await fireEvent.changeText(screen.getByLabelText('Search name, symbol or path'), 'gnomi');
    expect(screen.getByTestId('swap-token-gno.land/r/nym-thegnomic001/gnomic.GNOMIC')).toBeTruthy();
    expect(screen.getByTestId('swap-token-gno.land/r/g1n4pl5uc4yt5r96m9w6fmdznx3x0jyg8l6arhmt/gnomi/padv3.GNOMI')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Search name, symbol or path'), 'nym-thegnomic');
    expect(screen.queryByTestId('swap-token-gno.land/r/g1n4pl5uc4yt5r96m9w6fmdznx3x0jyg8l6arhmt/gnomi/padv3.GNOMI')).toBeNull();
    await fireEvent.press(screen.getByTestId('swap-token-gno.land/r/nym-thegnomic001/gnomic.GNOMIC'));
    expect(screen.getByRole('button', { name: 'Token to sell, GNOMIC' })).toBeTruthy();
  });

  it('shows insufficient liquidity when no route exists', async () => {
    await setup({ route: { estimatedRoutes: [] } });

    await pickGns();
    await typeAmount('1');
    expect(await screen.findByText('Insufficient liquidity', undefined, LOOKUP)).toBeTruthy();
  });

  it('offers a retry instead of insufficient liquidity when the swap APIs are unreachable', async () => {
    await setup({ route: null, pools: null });

    await pickGns();
    await typeAmount('1');
    expect(await screen.findByText('Retry quote', undefined, LOOKUP)).toBeTruthy();
    expect(screen.queryByText('Insufficient liquidity')).toBeNull();
  });

  it('stops offering review when a background quote refresh fails, until a retry succeeds', async () => {
    let down = false;
    const { client } = await setup({
      drySwap: (expression) => {
        if (down) {
          throw new Error('socket hang up');
        }

        return qeval.drySwapSplit.replace('"1000000"', `"${/"(\d+)", "EXACT_IN"/.exec(expression)?.[1]}"`);
      },
    });

    await pickGns();
    await typeAmount('1');
    await screen.findByText('4.15136', undefined, LOOKUP);
    down = true;
    await act(() => client.refetchQueries({ queryKey: [...queryKeys.all, 'swap-quote'] }));

    expect(await screen.findByText('Retry quote', undefined, LOOKUP)).toBeTruthy();
    expect(screen.queryByText('Review swap')).toBeNull();
    expect(screen.queryByText('4.15136')).toBeNull();
    down = false;
    await press('Retry quote');
    expect(await screen.findByText('Review swap', undefined, LOOKUP)).toBeTruthy();
  });

  it('offers a retry instead of review once the shown quote is past its TTL', async () => {
    await setup();
    await pickGns();
    // The screen's clock runs past the TTL; the service still stamps quotes with the real time.
    const now = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + SWAP_QUOTE_TTL_MS + 1000);

    try {
      await typeAmount('1');
      expect(await screen.findByText('Retry quote', undefined, LOOKUP)).toBeTruthy();
      expect(screen.queryByText('Review swap')).toBeNull();
      expect(screen.getByText('The quote expired. Fetch a new one.')).toBeTruthy();
    }
    finally {
      now.mockRestore();
    }
  });

  it('reviews and submits the swap, then refreshes', async () => {
    const { env } = await setup();

    await pickGns();
    await typeAmount('1');
    await screen.findByText('4.15136', undefined, LOOKUP);
    await press('Review swap');
    expect(await screen.findByText('Confirm swap', undefined, LOOKUP)).toBeTruthy();
    // Auto 0.5% of 4,151,365.
    expect(screen.getByText('4.1306 GNS')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('review-confirm'));
    await waitFor(() => expect(toastMessage()).toBe('Swap confirmed'), LOOKUP);
    expect(env.gno.state.broadcasts).toHaveLength(1);
  });

  it('clears a moved-quote review error once the quote is fetched again', async () => {
    const { env, dryExpressions } = await setup();
    const message = 'The quote is inconsistent. Fetch a new one.';

    jest.spyOn(env.container.swapService, 'prepare').mockRejectedValueOnce(new AppError(AppErrorCode.SWAP_PRICE_MOVED, message));
    await pickGns();
    await typeAmount('1');
    await screen.findByText('4.15136', undefined, LOOKUP);
    await press('Review swap');

    await waitFor(() => expect(dryExpressions).toHaveLength(2), LOOKUP);
    expect(await screen.findByText('Review swap', undefined, LOOKUP)).toBeTruthy();
    expect(screen.queryByText(message)).toBeNull();
    expect(toastMessage()).toBe(message);
  });

  it('keeps the pending notice visible next to a review error', async () => {
    const { env } = await setup({}, undefined, ({ env: testEnv, account: sender, network: current }) => {
      testEnv.container.pendingBroadcastRepository.add({ hashes: ['OLD'], accountId: sender.id, chainId: current.chainId, createdAt: Date.now(), sequence: '3', accountNumber: '7' });
    });

    jest.spyOn(env.container.swapService, 'prepare').mockRejectedValueOnce(new Error('Simulation failed'));
    await screen.findByText(REPLACEABLE_NOTICE, undefined, { timeout: PENDING_POLL_INTERVAL_MS + 2000 });
    await pickGns();
    await typeAmount('1');
    await screen.findByText('4.15136', undefined, LOOKUP);
    await press('Review swap');

    expect(await screen.findByText('Simulation failed', undefined, LOOKUP)).toBeTruthy();
    expect(screen.getByText(REPLACEABLE_NOTICE)).toBeTruthy();
  }, 15_000);

  it('drops the approximate-Max notice once the swap completes', async () => {
    const { env } = await setup();

    jest.spyOn(env.container.swapService, 'maxInputAmount').mockResolvedValue({ amount: '99000000', approximate: true });
    await pickGns();
    await press('Max');
    expect(await screen.findByText(/The amount is approximate\./, undefined, LOOKUP)).toBeTruthy();
    await screen.findByText('Review swap', undefined, LOOKUP);
    await press('Review swap');
    await fireEvent.press(await screen.findByTestId('review-confirm', undefined, LOOKUP));

    await waitFor(() => expect(toastMessage()).toBe('Swap confirmed'), LOOKUP);
    expect(screen.queryByText(/The amount is approximate\./)).toBeNull();
  });

  it('closes the review and fetches a new quote when the price moved before confirm', async () => {
    let amountOut = '4151365';
    const { env } = await setup({ drySwap: () => `("1000000" string)\n("${amountOut}" string)\n(undefined)` });

    await pickGns();
    await typeAmount('1');
    await screen.findByText('4.15136', undefined, LOOKUP);
    await press('Review swap');
    await screen.findByText('Confirm swap', undefined, LOOKUP);
    amountOut = '4000000';
    await fireEvent.press(screen.getByTestId('review-confirm'));

    await waitFor(() => expect(screen.queryByText('Confirm swap')).toBeNull(), LOOKUP);
    expect(toastMessage()).toBe('The price moved beyond your slippage. Review a new quote.');
    expect(await within(screen.getByTestId('swap-buy')).findByText('4', undefined, LOOKUP)).toBeTruthy();
    expect(screen.getByText('Review swap')).toBeTruthy();
    expect(env.gno.state.broadcasts).toHaveLength(0);
  });

  it('labels the review fee with the reviewed network even if the current network changes', async () => {
    const { env, network } = await setup();

    await pickGns();
    await typeAmount('1');
    await screen.findByText('4.15136', undefined, LOOKUP);
    await press('Review swap');
    await screen.findByText('Confirm swap', undefined, LOOKUP);
    jest.spyOn(env.container.networkService, 'getCurrentNetwork')
      .mockReturnValue({ ...network, feeToken: { ...network.feeToken, symbol: 'OTHER' } });
    await act(async () => useSessionStore.setState(state => ({ revision: state.revision + 1 })));

    expect(screen.getAllByText(/ GNOT$/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/ OTHER$/)).toBeNull();
  });

  it('waits for a swap that was only accepted into the mempool instead of reporting it confirmed', async () => {
    const { env } = await setup();

    jest.spyOn(env.container.swapService, 'submit').mockResolvedValueOnce({ hash: 'SUBMITTED', height: '0', committed: false });
    await pickGns();
    await typeAmount('1');
    await screen.findByText('4.15136', undefined, LOOKUP);
    await press('Review swap');
    await fireEvent.press(await screen.findByTestId('review-confirm', undefined, LOOKUP));

    expect(await screen.findByText(PENDING_NOTICE, undefined, LOOKUP)).toBeTruthy();
    expect(toastMessage()).not.toBe('Swap confirmed');
  });

  it('keeps the swap being typed when an earlier mempool-only swap confirms later', async () => {
    const { env, account, network } = await setup();
    let committed = false;

    jest.spyOn(env.container.swapService, 'submit').mockResolvedValueOnce({ hash: 'SUBMITTED', height: '0', committed: false });
    jest.spyOn(env.container.transactionService, 'reconcilePending').mockImplementation(async () => {
      const [record] = env.container.pendingBroadcastRepository.list(account.id, network.chainId);

      return committed && record
        ? { status: 'none', settled: [{ id: record.id, status: 'committed', hash: 'SUBMITTED' }] }
        : { status: 'pending', settled: [] };
    });
    await pickGns();
    await typeAmount('1');
    await screen.findByText('4.15136', undefined, LOOKUP);
    await press('Review swap');
    await fireEvent.press(await screen.findByTestId('review-confirm', undefined, LOOKUP));
    await screen.findByText(PENDING_NOTICE, undefined, LOOKUP);

    await typeAmount('2');
    committed = true;
    await waitFor(() => expect(toastMessage()).toBe('Swap confirmed'), { timeout: PENDING_POLL_INTERVAL_MS + 2000 });
    expect(within(screen.getByTestId('swap-sell')).getByText('12')).toBeTruthy();
    expect(screen.queryByText(PENDING_NOTICE)).toBeNull();
  }, 15_000);

  it('keeps a replacement review open mid-confirm when the replaced swap confirms, and shows why it failed', async () => {
    const { env, account, network } = await setup();
    let phase: 'replaceable' | 'committed' = 'replaceable';
    let rejectReplacement!: (error: unknown) => void;

    jest.spyOn(env.container.swapService, 'submit')
      .mockResolvedValueOnce({ hash: 'SUBMITTED', height: '0', committed: false })
      .mockReturnValueOnce(new Promise((_, reject) => {
        rejectReplacement = reject;
      }));
    jest.spyOn(env.container.transactionService, 'reconcilePending').mockImplementation(async () => {
      const [record] = env.container.pendingBroadcastRepository.list(account.id, network.chainId);

      return phase === 'committed' && record
        ? { status: 'none', settled: [{ id: record.id, status: 'committed', hash: 'SUBMITTED' }] }
        : { status: 'replaceable', sequence: '3', settled: [] };
    });
    await pickGns();
    await typeAmount('1');
    await screen.findByText('4.15136', undefined, LOOKUP);
    await press('Review swap');
    await fireEvent.press(await screen.findByTestId('review-confirm', undefined, LOOKUP));
    await screen.findByText(REPLACEABLE_NOTICE, undefined, { timeout: PENDING_POLL_INTERVAL_MS + 2000 });

    await press('Review swap');
    await fireEvent.press(await screen.findByTestId('review-confirm', undefined, LOOKUP));
    phase = 'committed';
    await waitFor(() => expect(toastMessage()).toBe('Swap confirmed'), { timeout: PENDING_POLL_INTERVAL_MS + 2000 });
    expect(screen.getByTestId('review-confirm')).toBeTruthy();
    await act(async () => rejectReplacement(new AppError(AppErrorCode.PREVIOUS_TRANSACTION_PENDING, PREVIOUS_TRANSACTION_RESOLVED_MESSAGE)));
    expect(await screen.findByText(PREVIOUS_TRANSACTION_RESOLVED_MESSAGE, undefined, LOOKUP)).toBeTruthy();
  }, 20_000);

  it('stores a swap with an unknown outcome for its account and network, so it stays blocked after a restart', async () => {
    const { env, account, network } = await setup();
    const provider = await env.gno.factory();

    // A transport failure leaves the outcome unknown; the hash is never indexed in this fake.
    provider.sendTransaction = async () => {
      throw new Error('socket hang up');
    };

    await pickGns();
    await typeAmount('1');
    await screen.findByText('4.15136', undefined, LOOKUP);
    await press('Review swap');
    await fireEvent.press(await screen.findByTestId('review-confirm', undefined, LOOKUP));

    await waitFor(() => expect(env.container.pendingBroadcastRepository.list(account.id, network.chainId)).toHaveLength(1), LOOKUP);
    expect(await screen.findByText(PENDING_NOTICE, undefined, LOOKUP)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Review swap' })).toBeNull();
  });

  it('replaces a replaceable pending tx pinned to its sequence and clears the record', async () => {
    const { env, account, network } = await setup({}, undefined, ({ env: testEnv, account: sender, network: current }) => {
      // Off chain and signed with the current on-chain sequence (3 in the fake node).
      testEnv.container.pendingBroadcastRepository.add({ hashes: ['OLD'], accountId: sender.id, chainId: current.chainId, createdAt: Date.now(), sequence: '3', accountNumber: '7' });
    });
    const sign = jest.spyOn(env.container.transactionService, 'sign');

    expect(await screen.findByText(REPLACEABLE_NOTICE, undefined, { timeout: PENDING_POLL_INTERVAL_MS + 2000 })).toBeTruthy();
    await pickGns();
    await typeAmount('1');
    await screen.findByText('4.15136', undefined, LOOKUP);
    await press('Review swap');
    await fireEvent.press(await screen.findByTestId('review-confirm', undefined, LOOKUP));

    await waitFor(() => expect(toastMessage()).toBe('Swap confirmed'), LOOKUP);
    expect(env.gno.state.broadcasts).toHaveLength(1);
    expect(sign).toHaveBeenLastCalledWith(expect.anything(), account, network, { sequence: '3', accountNumber: '7' });
    expect(env.container.pendingBroadcastRepository.list(account.id, network.chainId)).toEqual([]);
  }, 15_000);

  it('edits slippage and deadline in second-level views and persists them on Save', async () => {
    const { env } = await setup();

    await fireEvent.press(screen.getByTestId('swap-settings'));
    expect(screen.getByText('Swap settings')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Max slippage, Auto 0.50%' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Swap deadline, 10 minutes' })).toBeTruthy();
    expect(screen.getByTestId('swap-settings-save').props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.press(screen.getByTestId('swap-settings-slippage-row'));
    expect(screen.getByText('Max slippage')).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'Custom' }));
    await fireEvent.changeText(screen.getByTestId('swap-settings-slippage'), '80');
    expect(screen.getByText('Enter 0.01% to 50% with up to two decimals.')).toBeTruthy();
    expect(screen.getByTestId('swap-settings-done').props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.changeText(screen.getByTestId('swap-settings-slippage'), '10');
    expect(screen.getByText(/may be front-run/)).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('swap-settings-slippage'), '0.01');
    expect(screen.getByText('Very low slippage: the swap may fail.')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('swap-settings-slippage'), '1');
    await fireEvent.press(screen.getByTestId('swap-settings-done'));
    expect(screen.getByRole('button', { name: 'Max slippage, 1.00%' })).toBeTruthy();

    await fireEvent.press(screen.getByTestId('swap-settings-deadline-row'));
    await fireEvent.changeText(screen.getByTestId('swap-settings-deadline'), '0');
    expect(screen.getByText('Enter 1 to 180 minutes.')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('swap-settings-deadline'), '30');
    await fireEvent(screen.getByTestId('swap-settings-deadline'), 'submitEditing');
    expect(screen.getByRole('button', { name: 'Swap deadline, 30 minutes' })).toBeTruthy();

    await fireEvent.press(screen.getByTestId('swap-settings-save'));
    expect(env.container.preferenceService.get()).toMatchObject({ swapSlippage: 1, swapDeadlineMinutes: 30 });
    expect(screen.queryByText('Swap settings')).toBeNull();
  });

  it('applies saved slippage to the quote limits', async () => {
    const { env } = await setup();

    env.container.preferenceService.update({ swapSlippage: 1 });
    await pickGns();
    await typeAmount('1');
    await screen.findByText('4.15136', undefined, LOOKUP);
    await fireEvent.press(screen.getByTestId('swap-details-toggle'));
    // 4,151,365 x 0.99 = 4,109,851.
    expect(screen.getByText('4.10985 GNS')).toBeTruthy();
    expect(screen.getByText('1%')).toBeTruthy();
  });

  it('discards edits when the sheet closes without saving', async () => {
    const { env } = await setup();

    await fireEvent.press(screen.getByTestId('swap-settings'));
    await fireEvent.press(screen.getByTestId('swap-settings-deadline-row'));
    await fireEvent.changeText(screen.getByTestId('swap-settings-deadline'), '45');
    await fireEvent.press(screen.getByTestId('swap-settings-back'));
    expect(screen.getByRole('button', { name: 'Swap deadline, 45 minutes' })).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(env.container.preferenceService.get().swapDeadlineMinutes).toBe(10);

    await fireEvent.press(screen.getByTestId('swap-settings'));
    expect(screen.getByRole('button', { name: 'Swap deadline, 10 minutes' })).toBeTruthy();
  });

  it('explains that swap is unavailable on networks without GnoSwap', async () => {
    await setup({}, 'atomone-1');

    expect(screen.getByText('Swap isn’t available here')).toBeTruthy();
    expect(screen.queryByTestId('swap-action')).toBeNull();
  });
});

describe('swap screen helpers', () => {
  const token = (id: string, symbol: string, volume?: number): SwapToken => ({ id, symbol, name: symbol, swapPath: id, volume24hUsd: volume } as SwapToken);

  it('sorts by volume, then held tokens, and searches name, symbol and path', () => {
    const tokens = [token('gno.land/r/a/x.AAA', 'AAA'), token('gno.land/r/b/y.BBB', 'BBB', 10), token('gno.land/r/c/z.CCC', 'CCC')];

    expect(sortSwapTokens(tokens, { 'gno.land/r/c/z.CCC': '1' }).map(item => item.symbol)).toEqual(['BBB', 'CCC', 'AAA']);
    expect(searchSwapTokens(tokens, 'r/b/').map(item => item.symbol)).toEqual(['BBB']);
    expect(searchSwapTokens(tokens, ' ccc ').map(item => item.symbol)).toEqual(['CCC']);
  });

  it('computes percentage amounts capped at the spendable maximum', () => {
    expect(percentOfBalance('100000000', 25)).toBe('25000000');
    expect(percentOfBalance('100000000', 100, '97498680')).toBe('97498680');
    expect(percentOfBalance('100000000', 50, '97498680')).toBe('50000000');
    expect(percentOfBalance('100000000', 75, '60000000')).toBe('60000000');
    expect(percentOfBalance('3', 50)).toBe('1');
  });
});
