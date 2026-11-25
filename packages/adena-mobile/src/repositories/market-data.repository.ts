import { ChartRange, MarketLink, MarketStats, PricePoint, TokenMarketData, TokenMarketInfo } from '../domain/market';
import { Network } from '../domain/network';
import { Token, TokenType } from '../domain/token';
import { GNOSWAP_OHLCV_MAX_WINDOW, GnoswapApiClient, GnoswapCandle, GnoswapTokenMeta } from '../infrastructure/http/gnoswap-api.client';
import { DexApiConfig, DexApiConfigMap, DexProvider } from '../resources';

export interface MarketDataRequest {
  token: Token;
  network: Network;
  range: ChartRange;
}

export interface TokenInfoRequest {
  token: Token;
  network: Network;
}

// Price history, stats and links for the token details screen.
export interface MarketDataRepository {
  isSupported(network: Network): boolean;
  getMarketData(request: MarketDataRequest): Promise<TokenMarketData>;
  getTokenInfo(request: TokenInfoRequest): Promise<TokenMarketInfo>;
}

// Candle size and span per range, chosen to stay within the API's per-request windows.
export const RANGE_WINDOWS: Record<ChartRange, { interval: number; span: number }> = {
  [ChartRange.ONE_HOUR]: { interval: 300, span: 3_600 },
  [ChartRange.ONE_DAY]: { interval: 900, span: 86_400 },
  [ChartRange.ONE_WEEK]: { interval: 14_400, span: 604_800 },
  [ChartRange.ONE_MONTH]: { interval: 43_200, span: 2_592_000 },
  [ChartRange.ONE_YEAR]: { interval: 86_400, span: 31_536_000 },
};

const META_TTL_MS = 10 * 60_000;

const toPositive = (value: unknown): number | undefined => {
  const number = typeof value === 'string' || typeof value === 'number' ? Number(value) : Number.NaN;

  return Number.isFinite(number) && number > 0 ? number : undefined;
};

const httpsUrl = (value: string | undefined): string | undefined => (value && /^https:\/\/[^\s/]+/.test(value) ? value : undefined);

// Splits [start, end) into request windows the API accepts.
export const toOhlcvWindows = (start: number, end: number, interval: number): [number, number][] => {
  const max = Math.floor((GNOSWAP_OHLCV_MAX_WINDOW[interval] ?? interval) / interval) * interval;
  const windows: [number, number][] = [];

  for (let from = start; from < end; from += max) {
    windows.push([from, Math.min(from + max, end)]);
  }

  return windows;
};

interface Candle {
  start: number;
  open: number;
  close: number;
}

const toCandles = (items: GnoswapCandle[]): Candle[] => {
  const byStart = new Map<number, Candle>();

  for (const item of items) {
    const start = Date.parse(item.start);
    const open = toPositive(item.open);
    const close = toPositive(item.close);

    if (Number.isFinite(start) && open !== undefined && close !== undefined) {
      byStart.set(start, { start, open, close });
    }
  }

  return [...byStart.values()].sort((a, b) => a.start - b.start);
};

// Market data from the DEX API configured for the network; other networks get empty results.
export class DexMarketDataRepository implements MarketDataRepository {
  private readonly metas = new Map<string, { at: number; meta: Promise<GnoswapTokenMeta | null> }>();

  constructor(
    private readonly gnoswap: GnoswapApiClient,
    private readonly config: DexApiConfigMap,
    private readonly now: () => number = Date.now,
  ) {}

  isSupported(network: Network): boolean {
    return this.configFor(network) !== undefined;
  }

  async getMarketData({ token, network, range }: MarketDataRequest): Promise<TokenMarketData> {
    const empty: TokenMarketData = { tokenId: token.id, networkId: network.id, range, chart: [] };
    const config = this.configFor(network);

    if (!config) {
      return empty;
    }

    const bundledPath = token.type === TokenType.NATIVE ? config.wrappedPaths?.[this.pathOf(token)] : undefined;
    // A native coin's own denom has no candles, so without a wrapped path the failure must surface.
    const meta = await this.getMeta(config, token).catch((error: unknown) => {
      if (token.type === TokenType.NATIVE && !bundledPath) {
        throw error;
      }

      return null;
    });
    const path = meta?.wrappedPath || bundledPath || this.pathOf(token);
    const { interval, span } = RANGE_WINDOWS[range];
    const nowSec = Math.floor(this.now() / 1000);
    // Include the candle that is still forming.
    const end = Math.floor(nowSec / interval) * interval + interval;
    const pages = await Promise.all(toOhlcvWindows(end - span, end, interval)
      .map(([from, to]) => this.gnoswap.getOhlcv(config.apiUrl, path, interval, from, to)));
    const candles = toCandles(pages.flat());

    if (candles.length === 0) {
      return empty;
    }

    const first = candles[0];
    const last = candles[candles.length - 1];
    // Open of the first candle, then each close at its candle's end.
    const chart: PricePoint[] = [
      { timestamp: first.start, priceUsd: first.open },
      ...candles.map(candle => ({ timestamp: Math.min(candle.start + interval * 1000, this.now()), priceUsd: candle.close })),
    ];

    return { ...empty, chart, priceUsd: last.close, changePercent: ((last.close - first.open) / first.open) * 100 };
  }

  async getTokenInfo({ token, network }: TokenInfoRequest): Promise<TokenMarketInfo> {
    const info: TokenMarketInfo = { tokenId: token.id, networkId: network.id, stats: {}, links: [] };
    const config = this.configFor(network);

    if (!config) {
      return info;
    }

    const [meta, prices] = await Promise.all([
      this.getMeta(config, token).catch(() => null),
      this.gnoswap.getTokenPrices(config.apiUrl).catch(() => []),
    ]);
    const price = prices.find(item => item.path === this.pathOf(token));
    const stats: MarketStats = {
      marketCapUsd: toPositive(price?.marketCap),
      volume24hUsd: toPositive(price?.volumeUsd24h),
    };

    return { ...info, about: meta?.description?.trim() || undefined, stats, links: meta?.isVerified ? this.linksOf(meta) : [] };
  }

  private configFor(network: Network): DexApiConfig | undefined {
    const config = this.config[network.id];

    return config?.provider === DexProvider.GNOSWAP ? config : undefined;
  }

  // GnoSwap keys native coins by denom and GRC20s by "{pkgPath}.{symbol}" (the token id).
  private pathOf(token: Token): string {
    return token.type === TokenType.NATIVE ? token.denom ?? token.id : token.id;
  }

  private getMeta(config: DexApiConfig, token: Token): Promise<GnoswapTokenMeta | null> {
    const key = `${config.apiUrl}|${this.pathOf(token)}`;
    const cached = this.metas.get(key);

    if (cached && this.now() - cached.at < META_TTL_MS) {
      return cached.meta;
    }

    const meta = this.gnoswap.getTokenMeta(config.apiUrl, this.pathOf(token)).catch((error: unknown) => {
      this.metas.delete(key);
      throw error;
    });

    this.metas.set(key, { at: this.now(), meta });
    return meta;
  }

  // Only verified metas; unverified tokens can list any URL.
  private linksOf(meta: GnoswapTokenMeta): MarketLink[] {
    const candidates: [string, string | undefined][] = [
      ['Website', httpsUrl(meta.websiteURL)],
      ['Docs', httpsUrl(meta.docsURL)],
      ['X / Twitter', httpsUrl(meta.twitterURL)],
      ['Discord', httpsUrl(meta.discordURL)],
    ];

    return candidates.flatMap(([label, url]) => (url ? [{ label, url }] : []));
  }
}
