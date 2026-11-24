import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { percentOfBalance, searchSwapTokens, sortSwapTokens, SwapScreen } from '../../../../src/containers/main/swap-screen';
import { GNO_FEE_POLICY } from '../../../../src/domain/fee';
import { SwapToken } from '../../../../src/domain/swap';
import { SwapMaxResult } from '../../../../src/services/swap.service';
import { GnoswapFakeOptions, GNS, installGnoswapFakes } from '../../../helpers/gnoswap-fakes';
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

const setup = async (options: GnoswapFakeOptions = {}, networkId?: string) => {
  const env = createTestContainer();
  const fakes = installGnoswapFakes(env, { grc20Balances: { [GNS]: '5000000' }, ...options });
  const wallet = await setupWallet(env);

  env.gno.state.balances[wallet.address] = '100000000ugnot';

  if (networkId) {
    env.container.networkService.selectNetwork(networkId);
  }

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

  it('flips the tokens and sells the received amount', async () => {
    await setup();

    await pickGns();
    await typeAmount('1');
    await screen.findByText('4.15136', undefined, LOOKUP);
    await press('Switch tokens');
    expect(screen.getByRole('button', { name: 'Token to sell, GNS' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Token to buy, GNOT' })).toBeTruthy();
    expect(screen.getByText('4.151365')).toBeTruthy();
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

  it('saves custom slippage and deadline', async () => {
    const { env } = await setup();

    await fireEvent.press(screen.getByTestId('swap-settings'));
    await press('Custom');
    await fireEvent.changeText(screen.getByTestId('swap-settings-slippage'), '1.5');
    await fireEvent.changeText(screen.getByTestId('swap-settings-deadline'), '30');
    await fireEvent.press(screen.getByTestId('swap-settings-save'));
    expect(env.container.preferenceService.get()).toMatchObject({ swapSlippage: 1.5, swapDeadlineMinutes: 30 });

    await fireEvent.press(screen.getByTestId('swap-settings'));
    await fireEvent.changeText(screen.getByTestId('swap-settings-slippage'), '80');
    expect(screen.getByText('Enter 0.01% to 50% with up to two decimals.')).toBeTruthy();
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
