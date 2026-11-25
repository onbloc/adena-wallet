import { formatFeeTier, HIGH_PRICE_IMPACT_PERCENT, SwapQuote, SwapToken } from '../domain/swap';
import { BigNumber } from '../utils/big-number';
import { formatTokenPriceUSD } from '../utils/price';

export const SwapQuoteStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  NO_ROUTE: 'noRoute',
  ERROR: 'error',
} as const;

export type SwapQuoteStatus = (typeof SwapQuoteStatus)[keyof typeof SwapQuoteStatus];

export const SwapAction = {
  NONE: 'none',
  REVIEW: 'review',
  RETRY: 'retry',
} as const;

export type SwapAction = (typeof SwapAction)[keyof typeof SwapAction];

export interface SwapActionInput {
  supported: boolean;
  input?: SwapToken;
  output?: SwapToken;
  hasAmount: boolean;
  // The exact amount's raw units exceed int64, which no quote or tx can carry.
  tooLarge?: boolean;
  insufficient: boolean;
  // Display amount of the native wrap minimum when the input is below it.
  belowMinimumLabel?: string;
  sameToken: boolean;
  quoteStatus: SwapQuoteStatus;
  canSend: boolean;
  preparing: boolean;
}

export interface SwapActionState {
  label: string;
  action: SwapAction;
  disabled: boolean;
  loading: boolean;
}

const state = (label: string, action: SwapAction = SwapAction.NONE, loading = false): SwapActionState =>
  ({ label, action, disabled: action === SwapAction.NONE, loading });

// The primary button is the screen's state machine: the first unmet requirement names the label.
export const swapActionState = (input: SwapActionInput): SwapActionState => {
  if (!input.supported) {
    return state('Swap unavailable');
  }

  if (!input.input || !input.output) {
    return state('Select a token');
  }

  if (input.sameToken) {
    return state('Select a different token');
  }

  if (!input.hasAmount) {
    return state('Enter an amount');
  }

  if (input.tooLarge) {
    return state('Amount too large');
  }

  if (input.insufficient) {
    return state(`Not enough ${input.input.symbol}`);
  }

  if (input.belowMinimumLabel) {
    return state(`Minimum ${input.belowMinimumLabel}`);
  }

  if (!input.canSend) {
    return state('Waiting for previous swap…');
  }

  switch (input.quoteStatus) {
    case SwapQuoteStatus.IDLE:
    case SwapQuoteStatus.LOADING:
      return state('Fetching quote…', SwapAction.NONE, true);
    case SwapQuoteStatus.NO_ROUTE:
      return state('Insufficient liquidity');
    case SwapQuoteStatus.ERROR:
      return state('Retry quote', SwapAction.RETRY);
    case SwapQuoteStatus.READY:
      return { ...state('Review swap', SwapAction.REVIEW), loading: input.preparing };
  }
};

const BN = BigNumber.clone({ EXPONENTIAL_AT: 1e9, ROUNDING_MODE: BigNumber.ROUND_DOWN });

// Up to `significant` digits after leading zeros, grouped, e.g. 0.0000123 or 1,234.5678.
export const formatSwapAmount = (value: string | number | BigNumber, significant = 6): string => {
  const number = new BN(value);

  if (!number.isFinite() || number.isZero()) {
    return '0';
  }

  const decimals = number.abs().isGreaterThanOrEqualTo(1)
    ? Math.max(0, significant - number.integerValue().toFixed().length)
    : Math.max(0, -Math.floor(Math.log10(number.abs().toNumber())) - 1 + significant);

  return number.decimalPlaces(Math.min(decimals, 18)).toFormat({ decimalSeparator: '.', groupSeparator: ',', groupSize: 3 });
};

export const displayAmount = (raw: string, decimals: number): string => new BN(raw || '0').shiftedBy(-decimals).toFixed();

// "1 GNS = 0.2408 GNOT (≈$0.012)" from the quoted amounts.
export const formatSwapRate = (quote: SwapQuote, input: SwapToken, output: SwapToken): string | undefined => {
  const amountIn = new BN(quote.amountIn).shiftedBy(-input.decimals);
  const amountOut = new BN(quote.amountOut).shiftedBy(-output.decimals);

  if (amountIn.isZero() || amountOut.isZero()) {
    return undefined;
  }

  const rate = amountOut.dividedBy(amountIn);
  const usd = input.priceUsd ? ` (≈${formatTokenPriceUSD(input.priceUsd)})` : '';

  return `1 ${input.symbol} = ${formatSwapAmount(rate)} ${output.symbol}${usd}`;
};

export const formatPriceImpact = (percent: number | null): string => {
  if (percent === null) {
    return '—';
  }

  if (percent > -0.01) {
    return '<0.01%';
  }

  return `${Math.min(100, Math.abs(percent)).toFixed(2)}%`;
};

export const isHighPriceImpact = (percent: number | null): boolean => percent !== null && percent <= -HIGH_PRICE_IMPACT_PERCENT;

export const formatPercent = (value: number): string => `${Number(value.toFixed(2))}%`;

export interface SwapRouteView {
  key: string;
  share: string;
  // Token symbols in order, with the fee tier of each hop between them.
  steps: { symbol: string; fee?: string }[];
}

// Symbols for known paths; unknown intermediates show a short package name.
export const buildRouteViews = (quote: SwapQuote, tokens: SwapToken[]): SwapRouteView[] => {
  const symbolOf = (path: string): string =>
    tokens.find(token => token.swapPath === path && !token.isNative)?.symbol
    ?? tokens.find(token => token.swapPath === path)?.symbol
    ?? path.slice(path.lastIndexOf('.') + 1);

  return quote.routes.map((route, index) => ({
    key: `${index}:${route.hops.map(hop => `${hop.tokenIn}>${hop.tokenOut}:${hop.fee}`).join('|')}`,
    share: `${route.percent}%`,
    steps: [
      { symbol: symbolOf(route.hops[0].tokenIn) },
      ...route.hops.map(hop => ({ symbol: symbolOf(hop.tokenOut), fee: formatFeeTier(hop.fee) })),
    ],
  }));
};
