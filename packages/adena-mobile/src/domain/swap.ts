import { Token } from './token';

// Router limits from gno.land/r/gnoswap/router (README: max 3 pools per route, at most 7 routes, quotes sum to 100).
export const SWAP_MAX_HOPS = 3;
export const SWAP_MAX_ROUTES = 7;
export const ROUTE_POOL_SEPARATOR = '*POOL*';
export const MAX_INT64 = 9_223_372_036_854_775_807n;
const BPS_DENOMINATOR = 10_000n;

export const AUTO_SLIPPAGE_PERCENT = 0.5;
export const MIN_SLIPPAGE_PERCENT = 0.01;
export const MAX_SLIPPAGE_PERCENT = 50;
export const HIGH_SLIPPAGE_PERCENT = 5;
export const DEFAULT_DEADLINE_MINUTES = 10;
export const MIN_DEADLINE_MINUTES = 1;
export const MAX_DEADLINE_MINUTES = 180;
export const HIGH_PRICE_IMPACT_PERCENT = 5;

// A token as the swap screen lists it; `swapPath` is what the router trades (wugnot for GNOT).
export interface SwapToken extends Token {
  swapPath: string;
  verified: boolean;
  priceUsd?: number;
  volume24hUsd?: number;
}

export interface SwapHop {
  tokenIn: string;
  tokenOut: string;
  fee: number;
  // Raw tokenOut per raw tokenIn at the pool's current price, when the source reports it.
  midPrice?: string;
}

export interface SwapRoute {
  hops: SwapHop[];
  // Share of the input routed through this path, 1-100.
  percent: number;
}

export const SwapQuoteSource = {
  ROUTER_API: 'router-api',
  POOLS: 'pools',
} as const;

export type SwapQuoteSource = (typeof SwapQuoteSource)[keyof typeof SwapQuoteSource];

// Amounts are raw integers; `amountOut` is the router's own dry-run result, net of the router fee.
export interface SwapQuote {
  networkId: string;
  inputTokenId: string;
  outputTokenId: string;
  inputPath: string;
  outputPath: string;
  amountIn: string;
  amountOut: string;
  routes: SwapRoute[];
  routeArr: string;
  quoteArr: string;
  routerFeeBps: number;
  priceImpactPercent: number | null;
  source: SwapQuoteSource;
  quotedAt: number;
}

export interface SwapSettings {
  // Percent; null means Auto.
  slippage: number | null;
  deadlineMinutes: number;
}

export const DEFAULT_SWAP_SETTINGS: SwapSettings = { slippage: null, deadlineMinutes: DEFAULT_DEADLINE_MINUTES };

export const effectiveSlippage = (settings: SwapSettings): number => settings.slippage ?? AUTO_SLIPPAGE_PERCENT;

export const isValidSlippage = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= MIN_SLIPPAGE_PERCENT && value <= MAX_SLIPPAGE_PERCENT;

export const isValidDeadline = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= MIN_DEADLINE_MINUTES && value <= MAX_DEADLINE_MINUTES;

// Percent with at most two decimals, as basis points.
export const slippageToBps = (percent: number): number => {
  if (!isValidSlippage(percent)) {
    throw new Error(`invalid slippage: ${percent}`);
  }

  return Math.round(percent * 100);
};

export const isRawAmount = (value: unknown): value is string => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) && BigInt(value) <= MAX_INT64;

const assertPositiveRaw = (value: string, label: string): bigint => {
  if (!isRawAmount(value) || BigInt(value) <= 0n) {
    throw new Error(`invalid ${label}: ${value}`);
  }

  return BigInt(value);
};

// floor(amountOut * (1 - slippage)), never above the quote and never zero for a non-zero quote.
export const minAmountOut = (amountOut: string, slippageBps: number): string => {
  const out = assertPositiveRaw(amountOut, 'amount out');

  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps >= Number(BPS_DENOMINATOR)) {
    throw new Error(`invalid slippage bps: ${slippageBps}`);
  }

  const min = (out * (BPS_DENOMINATOR - BigInt(slippageBps))) / BPS_DENOMINATOR;

  return (min > 0n ? min : 1n).toString();
};

// Unix seconds the router compares with the block time.
export const swapDeadline = (nowMs: number, minutes: number): number => {
  if (!isValidDeadline(minutes)) {
    throw new Error(`invalid deadline: ${minutes}`);
  }

  return Math.floor(nowMs / 1000) + minutes * 60;
};

// Router fee already taken from a net output: net = gross * (1 - fee).
export const routerFeeOf = (amountOutNet: string, feeBps: number): string => {
  const net = BigInt(amountOutNet);

  if (feeBps <= 0 || net <= 0n) {
    return '0';
  }

  const gross = (net * BPS_DENOMINATOR) / (BPS_DENOMINATOR - BigInt(feeBps));

  return (gross - net).toString();
};

// "in:out:fee" hops joined by *POOL*, in swap direction.
export const encodeRoute = (route: SwapRoute): string =>
  route.hops.map(hop => `${hop.tokenIn}:${hop.tokenOut}:${hop.fee}`).join(ROUTE_POOL_SEPARATOR);

export const encodeRoutes = (routes: SwapRoute[]): { routeArr: string; quoteArr: string } => ({
  routeArr: routes.map(encodeRoute).join(','),
  quoteArr: routes.map(route => String(route.percent)).join(','),
});

// Structural checks the router also enforces, so a malformed API route never reaches a dry run or a signature.
export const validateRoutes = (routes: SwapRoute[], inputPath: string, outputPath: string, feeTiers: number[], isTokenPath: (path: string) => boolean): void => {
  if (inputPath === outputPath) {
    throw new Error('input and output tokens are the same');
  }

  if (routes.length === 0 || routes.length > SWAP_MAX_ROUTES) {
    throw new Error(`invalid route count: ${routes.length}`);
  }

  let total = 0;

  for (const route of routes) {
    if (!Number.isInteger(route.percent) || route.percent < 1 || route.percent > 100) {
      throw new Error(`invalid route share: ${route.percent}`);
    }

    total += route.percent;

    if (route.hops.length === 0 || route.hops.length > SWAP_MAX_HOPS) {
      throw new Error(`invalid hop count: ${route.hops.length}`);
    }

    let current = inputPath;

    for (const hop of route.hops) {
      if (hop.tokenIn !== current || !isTokenPath(hop.tokenIn) || !isTokenPath(hop.tokenOut) || hop.tokenIn === hop.tokenOut) {
        throw new Error('route hops are not continuous');
      }

      if (!feeTiers.includes(hop.fee)) {
        throw new Error(`unsupported fee tier: ${hop.fee}`);
      }

      current = hop.tokenOut;
    }

    if (current !== outputPath) {
      throw new Error('route does not end at the output token');
    }
  }

  if (total !== 100) {
    throw new Error(`route shares sum to ${total}`);
  }
};

// Execution vs. mid price before the router fee, in percent (negative = worse); null without pool prices.
export const estimatePriceImpact = (routes: SwapRoute[], amountIn: string, amountOutNet: string, routerFeeBps: number): number | null => {
  const input = Number(amountIn);
  const grossOut = Number(amountOutNet) / (1 - routerFeeBps / 10_000);
  let midOut = 0;

  for (const route of routes) {
    let price = 1;

    for (const hop of route.hops) {
      const mid = Number(hop.midPrice);

      if (!Number.isFinite(mid) || mid <= 0) {
        return null;
      }

      price *= mid;
    }

    midOut += (input * route.percent / 100) * price;
  }

  if (!Number.isFinite(midOut) || midOut <= 0 || !Number.isFinite(grossOut)) {
    return null;
  }

  return ((grossOut - midOut) / midOut) * 100;
};

// Distinct fee tiers as the GnoSwap UI labels them, e.g. 3000 -> "0.3%".
export const formatFeeTier = (fee: number): string => `${Number((fee / 10_000).toFixed(4))}%`;
