import { ChartRange, MarketStats, PricePoint, TokenMarketData } from '../domain/market';
import { Network } from '../domain/network';
import { Token } from '../domain/token';

export interface MarketDataRequest {
  token: Token;
  network: Network;
  range: ChartRange;
  // Live USD price when one is known; the series ends there so screens stay consistent.
  referencePriceUsd?: number;
}

// Price history, stats and links for the token details screen.
export interface MarketDataRepository {
  getMarketData(request: MarketDataRequest): Promise<TokenMarketData>;
}

const RANGE_SPEC: Record<ChartRange, { points: number; stepMs: number; volatility: number }> = {
  [ChartRange.ONE_HOUR]: { points: 60, stepMs: 60_000, volatility: 0.002 },
  [ChartRange.ONE_DAY]: { points: 96, stepMs: 15 * 60_000, volatility: 0.006 },
  [ChartRange.ONE_WEEK]: { points: 84, stepMs: 2 * 3_600_000, volatility: 0.012 },
  [ChartRange.ONE_MONTH]: { points: 90, stepMs: 8 * 3_600_000, volatility: 0.02 },
  [ChartRange.ONE_YEAR]: { points: 120, stepMs: 3 * 86_400_000, volatility: 0.045 },
};

// Deterministic PRNG so a token/range always draws the same sample curve.
const seededRandom = (seedText: string) => {
  let seed = 0;

  for (const ch of seedText) {
    seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  }

  return (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
};

// Placeholder until a market data API is chosen. Every response is flagged `isSample`.
export class MockMarketDataRepository implements MarketDataRepository {
  constructor(private readonly now: () => number = Date.now) {}

  async getMarketData({ token, network, range, referencePriceUsd }: MarketDataRequest): Promise<TokenMarketData> {
    const random = seededRandom(`${network.id}:${token.id}:${range}`);
    const spec = RANGE_SPEC[range];
    const lastPrice = referencePriceUsd ?? 0.05 + random() * 5;

    // Walk backwards from the latest price so the series ends exactly at it.
    const prices = [lastPrice];

    for (let index = 1; index < spec.points; index++) {
      const drift = (random() - 0.48) * spec.volatility;

      prices.unshift(Math.max(prices[0] * (1 - drift), lastPrice * 0.05));
    }

    const end = this.now();
    const chart: PricePoint[] = prices.map((priceUsd, index) => ({
      timestamp: end - (spec.points - 1 - index) * spec.stepMs,
      priceUsd,
    }));

    const supply = 1_000_000_000 * (0.2 + random());
    const stats: MarketStats = {
      marketCapUsd: lastPrice * supply,
      fullyDilutedValuationUsd: lastPrice * supply * (1.2 + random()),
      volume24hUsd: lastPrice * supply * (0.01 + random() * 0.05),
      high52wUsd: lastPrice * (1.3 + random()),
      low52wUsd: lastPrice * (0.3 + random() * 0.4),
    };

    return {
      tokenId: token.id,
      networkId: network.id,
      range,
      priceUsd: lastPrice,
      changePercent: ((lastPrice - prices[0]) / prices[0]) * 100,
      chart,
      stats,
      about: token.description,
      links: [],
      isSample: true,
    };
  }
}
