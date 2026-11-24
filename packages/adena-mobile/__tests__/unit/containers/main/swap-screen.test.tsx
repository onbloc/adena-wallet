import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { percentOfBalance, searchSwapTokens, sortSwapTokens, SwapScreen } from '../../../../src/containers/main/swap-screen';
import { SwapToken } from '../../../../src/domain/swap';
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

  it('fills percentages of the balance and keeps the fee reserve on Max', async () => {
    await setup();
    await screen.findByText('Balance 100', undefined, LOOKUP);

    await press('50%');
    expect(screen.getByText('50')).toBeTruthy();
    await press('Max');
    // 100 GNOT minus the 1 GNOT reserve from dex-apis.json.
    expect(screen.getByText('99')).toBeTruthy();
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

  it('computes percentage amounts with a native reserve', () => {
    expect(percentOfBalance('100000000', 25)).toBe('25000000');
    expect(percentOfBalance('100000000', 100, '1000000')).toBe('99000000');
    expect(percentOfBalance('500000', 100, '1000000')).toBe('0');
    expect(percentOfBalance('3', 50)).toBe('1');
  });
});
