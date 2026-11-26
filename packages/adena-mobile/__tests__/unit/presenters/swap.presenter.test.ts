import { SwapQuote, SwapToken } from '../../../src/domain/swap';
import {
  buildRouteViews,
  formatPriceImpact,
  formatSwapAmount,
  formatSwapRate,
  SwapAction,
  SwapActionInput,
  swapActionState,
  SwapQuoteStatus,
} from '../../../src/presenters/swap.presenter';

const token = (id: string, symbol: string, swapPath = id, extra: Partial<SwapToken> = {}): SwapToken => ({
  id, symbol, swapPath, name: symbol, networkId: 'gnoland-1', family: 'gno', type: 'grc20', decimals: 6, isNative: false, verified: true, ...extra,
} as SwapToken);

const WUGNOT = 'gno.land/r/gnoland/wugnot.wugnot';
const GNS = 'gno.land/r/gnoswap/gns.GNS';
const GNOT = token('ugnot', 'GNOT', WUGNOT, { isNative: true, type: 'native', priceUsd: 0.0524 });
const GNS_TOKEN = token(GNS, 'GNS');

const ready: SwapActionInput = {
  supported: true, input: GNOT, output: GNS_TOKEN, hasAmount: true, insufficient: false, sameToken: false, quoteStatus: SwapQuoteStatus.READY, canSend: true, preparing: false,
};

describe('swapActionState', () => {
  it('names the first unmet requirement', () => {
    const label = (overrides: Partial<SwapActionInput>): string => swapActionState({ ...ready, ...overrides }).label;

    expect(label({ supported: false })).toBe('Swap unavailable');
    expect(label({ output: undefined })).toBe('Select a token');
    expect(label({ sameToken: true })).toBe('Select a different token');
    expect(label({ hasAmount: false })).toBe('Enter an amount');
    expect(label({ tooLarge: true, insufficient: true })).toBe('Amount too large');
    expect(label({ insufficient: true })).toBe('Not enough GNOT');
    expect(label({ belowMinimumLabel: '0.001 GNOT' })).toBe('Minimum 0.001 GNOT');
    expect(label({ canSend: false })).toBe('Waiting for previous swap…');
    expect(label({ quoteStatus: SwapQuoteStatus.LOADING })).toBe('Fetching quote…');
    expect(label({ quoteStatus: SwapQuoteStatus.NO_ROUTE })).toBe('Insufficient liquidity');
    expect(label({ quoteStatus: SwapQuoteStatus.ERROR })).toBe('Retry quote');
    expect(label({})).toBe('Review swap');
  });

  it('only enables review and retry', () => {
    expect(swapActionState(ready)).toEqual({ label: 'Review swap', action: SwapAction.REVIEW, disabled: false, loading: false });
    expect(swapActionState({ ...ready, preparing: true }).loading).toBe(true);
    expect(swapActionState({ ...ready, quoteStatus: SwapQuoteStatus.ERROR })).toMatchObject({ action: SwapAction.RETRY, disabled: false });
    expect(swapActionState({ ...ready, quoteStatus: SwapQuoteStatus.LOADING })).toMatchObject({ disabled: true, loading: true });
    expect(swapActionState({ ...ready, insufficient: true }).disabled).toBe(true);
  });
});

describe('swap formatting', () => {
  const quote = {
    amountIn: '1000000',
    amountOut: '4151365',
    routes: [
      { percent: 50, hops: [{ tokenIn: WUGNOT, tokenOut: 'gno.land/r/x/gnomic.GNOMIC', fee: 3000 }, { tokenIn: 'gno.land/r/x/gnomic.GNOMIC', tokenOut: GNS, fee: 10000 }] },
      { percent: 50, hops: [{ tokenIn: WUGNOT, tokenOut: GNS, fee: 3000 }] },
    ],
  } as SwapQuote;

  it('formats the rate line, price impact and amounts', () => {
    expect(formatSwapRate(quote, GNOT, GNS_TOKEN)).toBe('1 GNOT = 4.15136 GNS (≈$0.0524)');
    expect(formatPriceImpact(-0.302)).toBe('0.30%');
    expect(formatPriceImpact(-0.001)).toBe('<0.01%');
    expect(formatPriceImpact(null)).toBe('—');
    expect(formatSwapAmount('0.00001234567')).toBe('0.0000123456');
    expect(formatSwapAmount('1234567.891')).toBe('1,234,567');
  });

  it('labels routes with symbols and fee tiers, preferring the GRC20 symbol for wugnot', () => {
    const views = buildRouteViews(quote, [GNOT, token(WUGNOT, 'wugnot'), GNS_TOKEN]);

    expect(views.map(view => [view.share, view.steps])).toEqual([
      ['50%', [{ symbol: 'wugnot' }, { symbol: 'GNOMIC', fee: '0.3%' }, { symbol: 'GNS', fee: '1%' }]],
      ['50%', [{ symbol: 'wugnot' }, { symbol: 'GNS', fee: '0.3%' }]],
    ]);
  });

  it('labels a path with the first listed token, so the prepared on-chain symbol wins over the API list', () => {
    const fromApi = { ...GNS_TOKEN, symbol: 'USDC' };
    const views = buildRouteViews(quote, [GNS_TOKEN, GNOT, token(WUGNOT, 'wugnot'), fromApi]);

    expect(views[1].steps.map(step => step.symbol)).toEqual(['wugnot', 'GNS']);
  });
});
