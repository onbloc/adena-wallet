import { ChainFamily, Network } from '../../../domain/network';
import { isRawAmount, SWAP_MAX_ROUTES, SwapHop, SwapRoute, SwapToken, validateRoutes } from '../../../domain/swap';
import { TokenType } from '../../../domain/token';
import { DexSwapConfig, getNativeTokenFor, isTokenPath } from '../../../resources';
import { BigNumber } from '../../../utils/big-number';
import { decodeGoString } from './gno-qeval';
import { parseRegistryKey } from './gno-token-key';

// Validation of untrusted GnoSwap API and router responses. Anything malformed is dropped or rejected.

export class SwapDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SwapDataError';
  }
}

const MAX_DECIMALS = 18;
const SYMBOL = /^[A-Za-z0-9._-]{1,16}$/;
// Control and bidi/format characters that could disguise a token name.
const isUnsafeChar = (code: number): boolean =>
  code < 0x20 || (code >= 0x7f && code <= 0x9f) || (code >= 0x200b && code <= 0x200f) || (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069);

const stripUnsafe = (text: string): string => [...text].filter(char => !isUnsafeChar(char.codePointAt(0) ?? 0)).join('');

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const cleanText = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const text = stripUnsafe(value).trim();

  return text.length > 0 && text.length <= maxLength ? text : null;
};

const httpsUrl = (value: unknown): string | undefined =>
  typeof value === 'string' && /^https:\/\/[^\s/]+\/\S*$/.test(value) ? value : undefined;

const positiveNumber = (value: unknown): number | undefined => {
  const number = typeof value === 'string' || typeof value === 'number' ? Number(value) : Number.NaN;

  return Number.isFinite(number) && number > 0 ? number : undefined;
};

const positiveDecimal = (value: unknown): string | undefined => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  const number = new BigNumber(value);

  return number.isFinite() && number.isGreaterThan(0) ? number.toFixed() : undefined;
};

const toFee = (value: unknown, feeTiers: number[]): number | null => {
  const fee = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;

  return typeof fee === 'number' && feeTiers.includes(fee) ? fee : null;
};

export interface SwapPriceInfo {
  usd?: number;
  volume24hUsd?: number;
}

export const parseSwapPrices = (raw: unknown): Map<string, SwapPriceInfo> => {
  const prices = new Map<string, SwapPriceInfo>();

  for (const item of Array.isArray(raw) ? raw : []) {
    const record = asRecord(item);
    const path = record?.path;

    if (typeof path === 'string' && (path.length <= 200)) {
      prices.set(path, { usd: positiveNumber(record?.usd), volume24hUsd: positiveNumber(record?.volumeUsd24h) });
    }
  }

  return prices;
};

// Native metadata always comes from the bundled network; GRC20 decimals are re-checked on chain before signing.
export const parseSwapTokens = (raw: unknown, prices: Map<string, SwapPriceInfo>, network: Network, config: DexSwapConfig): SwapToken[] => {
  const tokens = new Map<string, SwapToken>();
  const native = getNativeTokenFor(network);

  for (const item of Array.isArray(raw) ? raw : []) {
    const record = asRecord(item);

    if (!record) {
      continue;
    }

    const path = record.path;
    const price = typeof path === 'string' ? prices.get(path) : undefined;
    const imageUrl = httpsUrl(record.logoURI);
    const verified = record.isVerified === true;

    if (path === native.denom && path === config.wrappedNative.denom) {
      tokens.set(native.id, {
        ...native,
        imageUrl: native.localIcon ? undefined : imageUrl,
        swapPath: config.wrappedNative.tokenPath,
        verified: true,
        priceUsd: price?.usd,
        volume24hUsd: price?.volume24hUsd,
      });
      continue;
    }

    const key = isTokenPath(path) ? parseRegistryKey(path) : null;
    const symbol = cleanText(record.symbol, 16);
    const name = cleanText(record.name, 64);
    const decimals = record.decimals;

    if (!key || record.type !== 'GRC20' || !symbol || !SYMBOL.test(symbol) || !name
      || typeof decimals !== 'number' || !Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS) {
      continue;
    }

    tokens.set(path as string, {
      id: path as string,
      networkId: network.id,
      family: ChainFamily.GNO,
      type: TokenType.GRC20,
      name,
      symbol,
      decimals,
      pkgPath: key.pkgPath,
      imageUrl,
      isNative: false,
      swapPath: path as string,
      verified,
      priceUsd: price?.usd,
      volume24hUsd: price?.volume24hUsd,
    });
  }

  return [...tokens.values()];
};

const toHops = (pools: unknown, inputPath: string, feeTiers: number[]): SwapHop[] => {
  if (!Array.isArray(pools)) {
    throw new SwapDataError('route has no pools');
  }

  let current = inputPath;

  return pools.map((item) => {
    const pool = asRecord(item);
    const tokenA = pool?.tokenA;
    const tokenB = pool?.tokenB;
    const fee = toFee(pool?.fee, feeTiers);
    const price = positiveDecimal(pool?.price);

    if (!isTokenPath(tokenA) || !isTokenPath(tokenB) || fee === null) {
      throw new SwapDataError('route pool is malformed');
    }

    const forward = current === tokenA;

    if (!forward && current !== tokenB) {
      throw new SwapDataError('route pools are not continuous');
    }

    const hop: SwapHop = {
      tokenIn: current,
      tokenOut: forward ? tokenB : tokenA,
      fee,
      midPrice: price && (forward ? price : new BigNumber(1).dividedBy(price).toFixed()),
    };

    current = hop.tokenOut;
    return hop;
  });
};

// `/api/route` answer; an empty list means no liquidity for the pair or amount.
export const parseRouteResponse = (raw: unknown, inputPath: string, outputPath: string, feeTiers: number[]): SwapRoute[] => {
  const response = asRecord(raw);
  const estimated = response?.estimatedRoutes;

  if (!response || !Array.isArray(estimated)) {
    throw new SwapDataError('route response is malformed');
  }

  if (estimated.length === 0) {
    return [];
  }

  const routes = estimated.map((item): SwapRoute => {
    const route = asRecord(item);
    const percent = typeof route?.quote === 'string' ? Number(route.quote) : route?.quote;

    if (typeof percent !== 'number' || !Number.isInteger(percent)) {
      throw new SwapDataError('route share is malformed');
    }

    return { hops: toHops(route?.pools, inputPath, feeTiers), percent };
  });

  try {
    validateRoutes(routes, inputPath, outputPath, feeTiers, isTokenPath);
  }
  catch (error) {
    throw new SwapDataError((error as Error).message);
  }

  return routes;
};

export interface SwapPool {
  tokenA: string;
  tokenB: string;
  fee: number;
  // Raw tokenB per raw tokenA.
  price: string;
  tvlUsd: number;
}

// `/pools` data; a non-array answer is an outage, not an empty market, so it rejects.
export const parsePools = (raw: unknown, feeTiers: number[]): SwapPool[] => {
  if (!Array.isArray(raw)) {
    throw new SwapDataError('pools response is malformed');
  }

  return raw.flatMap((item): SwapPool[] => {
    const pool = asRecord(item);
    const tokenA = asRecord(pool?.tokenA)?.path;
    const tokenB = asRecord(pool?.tokenB)?.path;
    const fee = toFee(pool?.fee, feeTiers);
    const price = positiveDecimal(pool?.price);

    if (!isTokenPath(tokenA) || !isTokenPath(tokenB) || tokenA === tokenB || fee === null || !price) {
      return [];
    }

    return [{ tokenA, tokenB, fee, price, tvlUsd: positiveNumber(pool?.tvl) ?? 0 }];
  });
};

const hopThrough = (pool: SwapPool, tokenIn: string): SwapHop => {
  const forward = pool.tokenA === tokenIn;

  return {
    tokenIn,
    tokenOut: forward ? pool.tokenB : pool.tokenA,
    fee: pool.fee,
    midPrice: forward ? pool.price : new BigNumber(1).dividedBy(pool.price).toFixed(),
  };
};

const joins = (pool: SwapPool, a: string, b: string): boolean =>
  (pool.tokenA === a && pool.tokenB === b) || (pool.tokenA === b && pool.tokenB === a);

// Direct pools and one-intermediate paths, deepest liquidity first; each candidate is one full route.
export const buildPoolCandidates = (pools: SwapPool[], inputPath: string, outputPath: string, limit = SWAP_MAX_ROUTES): SwapRoute[] => {
  const byTvl = [...pools].sort((a, b) => b.tvlUsd - a.tvlUsd);
  const scored: { route: SwapRoute; depth: number }[] = byTvl
    .filter(pool => joins(pool, inputPath, outputPath))
    .map(pool => ({ route: { hops: [hopThrough(pool, inputPath)], percent: 100 }, depth: pool.tvlUsd }));

  const intermediates = new Set(byTvl.flatMap(pool => [pool.tokenA, pool.tokenB]).filter(path => path !== inputPath && path !== outputPath));

  for (const middle of intermediates) {
    const first = byTvl.find(pool => joins(pool, inputPath, middle));
    const second = byTvl.find(pool => joins(pool, middle, outputPath));

    if (first && second) {
      scored.push({
        route: { hops: [hopThrough(first, inputPath), hopThrough(second, middle)], percent: 100 },
        depth: Math.min(first.tvlUsd, second.tvlUsd),
      });
    }
  }

  return scored.sort((a, b) => b.depth - a.depth).slice(0, limit).map(item => item.route);
};

const STRING_TUPLE = /^\("((?:[^"\\]|\\.)*)" string\)$/;

// DrySwapRoute returns `(amountIn string) (amountOut string) (err error)`; a non-nil error carries its message.
export const parseDrySwapResult = (raw: string): { amountIn: string; amountOut: string } => {
  const lines = raw.trim().split('\n');
  const amountIn = STRING_TUPLE.exec(lines[0] ?? '')?.[1];
  const amountOut = STRING_TUPLE.exec(lines[1] ?? '')?.[1];
  const error = lines.slice(2).join('\n').trim();

  if (error !== '(undefined)') {
    const message = /\("((?:[^"\\]|\\.)*)" string\)/.exec(error)?.[1];

    throw new SwapDataError(message ? decodeGoString(`"${message}"`) : 'The router rejected the route');
  }

  if (!isRawAmount(amountIn) || !isRawAmount(amountOut)) {
    throw new SwapDataError('router returned a malformed amount');
  }

  return { amountIn, amountOut };
};

// Router fee in basis points, bounded by the realm to 0-1000.
export const parseSwapFee = (raw: string): number => {
  const match = /^\((\d+) uint64\)$/.exec(raw.trim());
  const fee = match ? Number(match[1]) : Number.NaN;

  if (!Number.isInteger(fee) || fee < 0 || fee > 1000) {
    throw new SwapDataError('router fee is malformed');
  }

  return fee;
};
