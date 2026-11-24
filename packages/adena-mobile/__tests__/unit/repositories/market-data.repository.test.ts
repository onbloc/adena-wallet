import { CHART_RANGES, ChartRange } from '../../../src/domain/market';
import { Network } from '../../../src/domain/network';
import { Token } from '../../../src/domain/token';
import { MockMarketDataRepository } from '../../../src/repositories/market-data.repository';

const token = { id: 'ugnot', description: 'Gno token' } as Token;
const network = { id: 'gnoland-1' } as Network;
const NOW = 1_700_000_000_000;

const SPEC: Record<ChartRange, { points: number; stepMs: number }> = {
  [ChartRange.ONE_HOUR]: { points: 60, stepMs: 60_000 },
  [ChartRange.ONE_DAY]: { points: 96, stepMs: 15 * 60_000 },
  [ChartRange.ONE_WEEK]: { points: 84, stepMs: 2 * 3_600_000 },
  [ChartRange.ONE_MONTH]: { points: 90, stepMs: 8 * 3_600_000 },
  [ChartRange.ONE_YEAR]: { points: 120, stepMs: 3 * 86_400_000 },
};

describe('MockMarketDataRepository', () => {
  const repository = new MockMarketDataRepository(() => NOW);

  it.each(CHART_RANGES)('builds a %s series ending at now and at the reference price', async (range) => {
    const data = await repository.getMarketData({ token, network, range, referencePriceUsd: 2.5 });
    const { points, stepMs } = SPEC[range];

    expect(data.chart).toHaveLength(points);
    expect(data.chart[points - 1]).toEqual({ timestamp: NOW, priceUsd: 2.5 });
    expect(data.chart[0].timestamp).toBe(NOW - (points - 1) * stepMs);
    expect(data.chart.every(point => point.priceUsd >= 2.5 * 0.05)).toBe(true);
    expect(data.priceUsd).toBe(2.5);
    expect(data.changePercent).toBeCloseTo(((2.5 - data.chart[0].priceUsd) / data.chart[0].priceUsd) * 100);
    expect(data).toMatchObject({ tokenId: 'ugnot', networkId: 'gnoland-1', range, about: 'Gno token', links: [], isSample: true });
  });

  it('is deterministic per token, network and range', async () => {
    const a = await repository.getMarketData({ token, network, range: ChartRange.ONE_DAY });
    const b = await repository.getMarketData({ token, network, range: ChartRange.ONE_DAY });
    const other = await repository.getMarketData({ token: { ...token, id: 'other' }, network, range: ChartRange.ONE_DAY });

    expect(a).toEqual(b);
    expect(other.priceUsd).not.toBe(a.priceUsd);
  });

  it('draws a sample price in range when no reference is given', async () => {
    const data = await repository.getMarketData({ token, network, range: ChartRange.ONE_WEEK });

    expect(data.priceUsd).toBeGreaterThanOrEqual(0.05);
    expect(data.priceUsd).toBeLessThanOrEqual(5.05);
  });

  it('derives plausible stats from the last price', async () => {
    const { stats, priceUsd } = await repository.getMarketData({ token, network, range: ChartRange.ONE_MONTH, referencePriceUsd: 1 });

    expect(stats.fullyDilutedValuationUsd!).toBeGreaterThan(stats.marketCapUsd!);
    expect(stats.high52wUsd!).toBeGreaterThan(priceUsd);
    expect(stats.low52wUsd!).toBeLessThan(priceUsd);
    expect(stats.volume24hUsd!).toBeGreaterThan(0);
  });

  it('keeps the floor for a zero reference price', async () => {
    const data = await repository.getMarketData({ token, network, range: ChartRange.ONE_HOUR, referencePriceUsd: 0 });

    expect(data.chart.every(point => point.priceUsd === 0)).toBe(true);
    expect(Number.isNaN(data.changePercent)).toBe(true);
  });

  it('defaults to the wall clock', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(42);
    const data = await new MockMarketDataRepository().getMarketData({ token, network, range: ChartRange.ONE_HOUR });

    expect(data.chart.at(-1)!.timestamp).toBe(42);
    jest.restoreAllMocks();
  });
});
