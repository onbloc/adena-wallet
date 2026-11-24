import { CHART_RANGES, ChartRange } from '../../../src/domain/market';
import { ChainFamily, Network } from '../../../src/domain/network';
import { Token, TokenType } from '../../../src/domain/token';
import { GNOSWAP_OHLCV_MAX_WINDOW, GnoswapApiClient } from '../../../src/infrastructure/http/gnoswap-api.client';
import { DexMarketDataRepository, RANGE_WINDOWS, toOhlcvWindows } from '../../../src/repositories/market-data.repository';
import { DexApiConfigMap } from '../../../src/resources';
import { FakeHttpClient } from '../../helpers/fake-http';

const API = 'https://dex.example/api/v1';
const CONFIG: DexApiConfigMap = { 'gnoland-1': { provider: 'gnoswap', apiUrl: API } };
const network = { id: 'gnoland-1', family: ChainFamily.GNO } as Network;
const otherNetwork = { id: 'onyx-1', family: ChainFamily.GNO } as Network;
const gnot = { id: 'ugnot', denom: 'ugnot', type: TokenType.NATIVE, isNative: true } as Token;
const gns = { id: 'gno.land/r/gnoswap/gns.GNS', type: TokenType.GRC20 } as Token;
const WUGNOT = 'gno.land/r/gnoland/wugnot.wugnot';
// 2026-11-24T05:27:30Z
const NOW = 1_795_584_450_000;

const meta = (overrides: Record<string, unknown> = {}) => ({
  path: 'ugnot',
  name: 'Gno.land',
  symbol: 'GNOT',
  description: 'Gno.land is a platform.',
  type: 'Native',
  decimals: 6,
  logoURI: '',
  wrappedPath: WUGNOT,
  websiteURL: 'https://gno.land/',
  twitterURL: 'https://x.com/_gnoland',
  discordURL: '',
  docsURL: 'http://docs.example',
  isVerified: true,
  ...overrides,
});
const candle = (start: number, open: string, close: string) => ({ start: new Date(start * 1000).toISOString(), open, high: close, low: open, close, volume: '0' });
const metaUrl = (path: string) => `${API}/token-metas/${encodeURIComponent(path)}`;
const ohlcvUrl = (path: string, interval: number, start: number, end: number) =>
  `${API}/tokens/${encodeURIComponent(path)}/ohlcv?interval=${interval}&start=${start}&end=${end}`;

const setup = () => {
  const http = new FakeHttpClient();
  const repository = new DexMarketDataRepository(new GnoswapApiClient(http), CONFIG, () => NOW);

  return { http, repository };
};

describe('toOhlcvWindows', () => {
  it('splits a span into aligned windows within the API limit', () => {
    const { interval, span } = RANGE_WINDOWS[ChartRange.ONE_YEAR];
    const windows = toOhlcvWindows(1000 * interval - span, 1000 * interval, interval);

    expect(windows).toHaveLength(13);
    expect(windows[0][0]).toBe(1000 * interval - span);
    expect(windows[windows.length - 1][1]).toBe(1000 * interval);
    windows.forEach(([from, to]) => {
      expect(to - from).toBeLessThanOrEqual(GNOSWAP_OHLCV_MAX_WINDOW[interval]);
      expect(from % interval).toBe(0);
    });
  });

  it.each(CHART_RANGES.filter(range => range !== ChartRange.ONE_YEAR))('fetches %s in a single request', (range) => {
    const { interval, span } = RANGE_WINDOWS[range];

    expect(span % interval).toBe(0);
    expect(toOhlcvWindows(0, span, interval)).toEqual([[0, span]]);
  });
});

describe('DexMarketDataRepository', () => {
  it('charts a native coin through its wrapped token, from the range open to the latest close', async () => {
    const { http, repository } = setup();
    const end = Math.floor(NOW / 1000 / 900) * 900 + 900;
    const start = end - 86_400;

    http.on(metaUrl('ugnot'), { data: meta() });
    http.on(ohlcvUrl(WUGNOT, 900, start, end), {
      data: [candle(end - 900, '0.052', '0.0521'), candle(start, '0.05', '0.051'), candle(start + 900, 'NaN', '0.051'), candle(start + 900, '0.051', '0.0515')],
    });

    const data = await repository.getMarketData({ token: gnot, network, range: ChartRange.ONE_DAY });

    expect(data.chart.map(point => point.priceUsd)).toEqual([0.05, 0.051, 0.0515, 0.0521]);
    expect(data.chart[0].timestamp).toBe(start * 1000);
    expect(data.chart[data.chart.length - 1].timestamp).toBe(NOW);
    expect(data.priceUsd).toBe(0.0521);
    expect(data.changePercent).toBeCloseTo(4.2);
  });

  it('charts a GRC20 by its token id and merges the yearly windows', async () => {
    const { http, repository } = setup();
    const { interval, span } = RANGE_WINDOWS[ChartRange.ONE_YEAR];
    const end = Math.floor(NOW / 1000 / interval) * interval + interval;
    const windows = toOhlcvWindows(end - span, end, interval);

    http.on(metaUrl(gns.id), { data: meta({ path: gns.id, wrappedPath: '' }) });
    windows.forEach(([from, to], index) => http.on(ohlcvUrl(gns.id, interval, from, to), { data: [candle(from, String(index + 1), String(index + 2))] }));

    const data = await repository.getMarketData({ token: gns, network, range: ChartRange.ONE_YEAR });

    expect(data.chart).toHaveLength(windows.length + 1);
    expect(data.priceUsd).toBe(windows.length + 1);
    expect(data.changePercent).toBeCloseTo(windows.length * 100);
  });

  it('returns an empty chart when the token has no candles', async () => {
    const { http, repository } = setup();
    const end = Math.floor(NOW / 1000 / 300) * 300 + 300;

    http.on(metaUrl(gns.id), { data: meta({ path: '' }) });
    http.on(ohlcvUrl(gns.id, 300, end - 3600, end), { data: [] });

    await expect(repository.getMarketData({ token: gns, network, range: ChartRange.ONE_HOUR }))
      .resolves.toEqual({ tokenId: gns.id, networkId: 'gnoland-1', range: ChartRange.ONE_HOUR, chart: [] });
  });

  it('propagates candle request failures', async () => {
    const { http, repository } = setup();

    http.on(metaUrl(gns.id), { data: meta({ path: gns.id, wrappedPath: '' }) });
    await expect(repository.getMarketData({ token: gns, network, range: ChartRange.ONE_HOUR })).rejects.toThrow('404');
  });

  it('reads about, stats and https links from the token meta and price list', async () => {
    const { http, repository } = setup();

    http.on(metaUrl('ugnot'), { data: meta() });
    http.on(`${API}/tokens/prices`, { data: [{ path: WUGNOT, usd: '1', marketCap: '9' }, { path: 'ugnot', usd: '0.05', marketCap: '69594446.36', volumeUsd24h: '4036.25' }] });

    await expect(repository.getTokenInfo({ token: gnot, network })).resolves.toEqual({
      tokenId: 'ugnot',
      networkId: 'gnoland-1',
      about: 'Gno.land is a platform.',
      stats: { marketCapUsd: 69594446.36, volume24hUsd: 4036.25 },
      links: [{ label: 'Website', url: 'https://gno.land/' }, { label: 'X / Twitter', url: 'https://x.com/_gnoland' }],
    });
  });

  it('treats an unknown token meta as missing and survives a price list failure', async () => {
    const { http, repository } = setup();

    http.on(metaUrl(gns.id), { data: meta({ path: '', description: '', websiteURL: '', twitterURL: '' }) });

    await expect(repository.getTokenInfo({ token: gns, network }))
      .resolves.toEqual({ tokenId: gns.id, networkId: 'gnoland-1', about: undefined, stats: { marketCapUsd: undefined, volume24hUsd: undefined }, links: [] });
  });

  it('caches token metas across ranges', async () => {
    const { http, repository } = setup();

    http.on(metaUrl(gns.id), { data: meta({ path: gns.id, wrappedPath: '' }) });
    http.on(`${API}/tokens/prices`, { data: [] });
    await repository.getTokenInfo({ token: gns, network });
    await repository.getTokenInfo({ token: gns, network });

    expect(http.calls.filter(url => url === metaUrl(gns.id))).toHaveLength(1);
  });

  it('makes no requests on networks without a configured DEX API', async () => {
    const { http, repository } = setup();

    expect(repository.isSupported(otherNetwork)).toBe(false);
    expect((await repository.getMarketData({ token: gnot, network: otherNetwork, range: ChartRange.ONE_DAY })).chart).toEqual([]);
    expect(await repository.getTokenInfo({ token: gnot, network: otherNetwork })).toEqual({ tokenId: 'ugnot', networkId: 'onyx-1', stats: {}, links: [] });
    expect(http.calls).toEqual([]);
  });
});
