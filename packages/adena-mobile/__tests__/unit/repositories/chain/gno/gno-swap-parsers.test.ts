import {
  buildPoolCandidates,
  parseDrySwapResult,
  parsePools,
  parseRouteResponse,
  parseSwapFee,
  parseSwapPrices,
  parseSwapTokens,
  SwapDataError,
} from '../../../../../src/repositories/chain/gno/gno-swap-parsers';
import { BUILT_IN_NETWORKS, DEX_API_CONFIG } from '../../../../../src/resources';
import poolsDev from '../../../../fixtures/gnoswap/pools.gnoswap.json';
import prices from '../../../../fixtures/gnoswap/prices.gnoland-1.json';
import qeval from '../../../../fixtures/gnoswap/qeval.json';
import routeDevBtc from '../../../../fixtures/gnoswap/route-dev-btc.json';
import routeDevNone from '../../../../fixtures/gnoswap/route-dev-none.json';
import routeMainnet from '../../../../fixtures/gnoswap/route-mainnet.json';
import routeOnyx from '../../../../fixtures/gnoswap/route-onyx.json';
import routeOutDev from '../../../../fixtures/gnoswap/route-out-dev.json';
import routeOutMainnet from '../../../../fixtures/gnoswap/route-out-mainnet.json';
import metas from '../../../../fixtures/gnoswap/token-metas.gnoland-1.json';
import metasDev from '../../../../fixtures/gnoswap/token-metas.gnoswap.json';

const mainnet = BUILT_IN_NETWORKS.find(network => network.id === 'gnoland-1')!;
const dev = BUILT_IN_NETWORKS.find(network => network.id === 'gnoswap')!;
const config = DEX_API_CONFIG['gnoland-1'].swap!;
const TIERS = config.feeTiers;
const WUGNOT = 'gno.land/r/gnoland/wugnot.wugnot';
const GNS = 'gno.land/r/gnoswap/gns.GNS';
const GNOMIC = 'gno.land/r/nym-thegnomic001/gnomic.GNOMIC';
const BTC = 'gno.land/r/gnoswap/test_token/test_btc.BTC';

describe('parseSwapTokens', () => {
  it('maps the captured mainnet token-metas with bundled native metadata and API prices', () => {
    const tokens = parseSwapTokens(metas.data, parseSwapPrices(prices.data), mainnet, config);
    const gnot = tokens.find(token => token.id === 'ugnot')!;
    const gns = tokens.find(token => token.id === GNS)!;

    expect(tokens.map(token => token.symbol)).toEqual(['GNOT', 'wugnot', 'GNS', 'GNOMIC', 'PERUN', 'GNOMI', 'BUBBLE']);
    expect(gnot).toMatchObject({ type: 'native', decimals: 6, swapPath: WUGNOT, localIcon: 'gnot', verified: true, isNative: true });
    expect(gnot.priceUsd).toBeCloseTo(0.0524, 3);
    expect(gns).toMatchObject({ type: 'grc20', name: 'GnoSwap', decimals: 6, pkgPath: 'gno.land/r/gnoswap/gns', swapPath: GNS, isNative: false });
    expect(gns.imageUrl).toMatch(/^https:\/\//);
    expect(tokens.find(token => token.symbol === 'GNOMI')?.decimals).toBe(0);
  });

  it('drops malformed entries and strips control characters from names', () => {
    const tokens = parseSwapTokens([
      { type: 'GRC20', path: 'gno.land/r/x/a.A', name: 'A‮B\u0007', symbol: 'A', decimals: 6, logoURI: 'http://insecure/a.png' },
      { type: 'GRC20', path: 'gno.land/r/x/b.B', name: 'B', symbol: 'B', decimals: 19 },
      { type: 'GRC20', path: 'gno.land/r/x/c.C', name: 'C', symbol: 'C C', decimals: 6 },
      { type: 'GRC20', path: 'gno.land/p/x/d.D', name: 'D', symbol: 'D', decimals: 6 },
      { type: 'GRC20', path: 'gno.land/r/x/e', name: 'E', symbol: 'E', decimals: 6 },
      { type: 'GRC20', path: 'gno.land/r/x/f.F', name: '', symbol: 'F', decimals: 6 },
      { type: 'Native', path: 'uatone', name: 'Fake', symbol: 'GNOT', decimals: 18 },
      { type: 'Native', path: 'ugnot', name: 'Fake GNOT', symbol: 'FAKE', decimals: 18 },
      'garbage',
    ], new Map(), mainnet, config);

    expect(tokens.map(token => [token.id, token.name, token.symbol, token.decimals, token.imageUrl])).toEqual([
      ['gno.land/r/x/a.A', 'AB', 'A', 6, undefined],
      // The native entry keeps the bundled name, symbol and decimals whatever the API says.
      ['ugnot', 'Gno.land', 'GNOT', 6, undefined],
    ]);
    expect(parseSwapTokens({ data: [] }, new Map(), mainnet, config)).toEqual([]);
  });

  it('marks unverified tokens from the dev host', () => {
    const tokens = parseSwapTokens(metasDev.data, new Map(), dev, DEX_API_CONFIG.gnoswap.swap!);

    expect(tokens.find(token => token.id === BTC)).toMatchObject({ decimals: 8, verified: true });
    expect(tokens.length).toBe(12);
  });
});

describe('parseRouteResponse', () => {
  it('turns the mainnet split into swap-direction hops with mid prices', () => {
    const routes = parseRouteResponse(routeMainnet, WUGNOT, GNS, TIERS);

    expect(routes).toHaveLength(2);
    expect(routes[0]).toMatchObject({ percent: 50, hops: [{ tokenIn: WUGNOT, tokenOut: GNOMIC, fee: 3000 }, { tokenIn: GNOMIC, tokenOut: GNS, fee: 10000 }] });
    // The second pool is listed GNS:GNOMIC, so its price is inverted for the GNOMIC -> GNS direction.
    expect(Number(routes[0].hops[1].midPrice)).toBeCloseTo(1 / 1.361224389360522702, 9);
    expect(routes[1]).toMatchObject({ percent: 50, hops: [{ tokenIn: WUGNOT, tokenOut: GNS, fee: 3000, midPrice: '4.099764178850461072' }] });
  });

  it('parses single routes from onyx and dev, and an empty answer as no route', () => {
    expect(parseRouteResponse(routeOnyx, WUGNOT, GNS, TIERS)).toEqual([{ percent: 100, hops: [expect.objectContaining({ tokenIn: WUGNOT, tokenOut: GNS, fee: 3000 })] }]);
    expect(parseRouteResponse(routeDevBtc, WUGNOT, BTC, TIERS)[0].hops[0]).toMatchObject({ tokenOut: BTC, midPrice: '0.00006009919971545' });
    expect(parseRouteResponse(routeDevNone, 'gno.land/r/gnoswap/test_token/test_atone.ATONE', BTC, TIERS)).toEqual([]);
  });

  it('parses EXACT_OUT answers (route amounts are swapped there, only pools and shares are used)', () => {
    const routes = parseRouteResponse(routeOutMainnet, WUGNOT, GNS, TIERS);

    expect(routeOutMainnet.exactType).toBe('EXACT_OUT');
    expect(routes.map(route => [route.percent, route.hops.length])).toEqual([[50, 2], [50, 1]]);
    expect(parseRouteResponse(routeOutDev, WUGNOT, 'gno.land/r/gnoswap/test_token/test_usdc.USDC', TIERS)[0].hops[0].fee).toBe(3000);
  });

  it('rejects tampered or malformed routes', () => {
    const tamper = (mutate: (route: typeof routeMainnet) => void) => (): unknown => {
      const copy = structuredClone(routeMainnet);

      mutate(copy);
      return parseRouteResponse(copy, WUGNOT, GNS, TIERS);
    };

    const shares = (route: typeof routeMainnet): void => {
      route.estimatedRoutes[0].quote = 60;
    };
    const feeTier = (route: typeof routeMainnet): void => {
      route.estimatedRoutes[1].pools[0].fee = 2500;
    };
    const foreignToken = (route: typeof routeMainnet): void => {
      route.estimatedRoutes[1].pools[0].tokenA = 'gno.land/r/evil/x.X';
    };
    const reordered = (route: typeof routeMainnet): void => {
      route.estimatedRoutes[0].pools.reverse();
    };

    [shares, feeTier, foreignToken, reordered].forEach(mutate => expect(tamper(mutate)).toThrow(SwapDataError));
    expect(() => parseRouteResponse(routeMainnet, WUGNOT, GNOMIC, TIERS)).toThrow(SwapDataError);
    expect(() => parseRouteResponse({ error: 'boom' }, WUGNOT, GNS, TIERS)).toThrow(SwapDataError);
    expect(() => parseRouteResponse(null, WUGNOT, GNS, TIERS)).toThrow(SwapDataError);
  });
});

describe('pool candidates', () => {
  it('builds direct and one-intermediate routes from the captured dev pools, deepest first', () => {
    const pools = parsePools(poolsDev.data, TIERS);
    const USDC = 'gno.land/r/gnoswap/test_token/test_usdc.USDC';
    const candidates = buildPoolCandidates(pools, WUGNOT, USDC);

    expect(pools).toHaveLength(poolsDev.data.length);
    expect(candidates[0].hops.map(hop => hop.tokenOut).at(-1)).toBe(USDC);
    expect(candidates.every(route => route.percent === 100 && route.hops[0].tokenIn === WUGNOT && route.hops.at(-1)!.tokenOut === USDC)).toBe(true);
    // wugnot -> SOL -> USDC goes through the 16.7M TVL SOL/USDC pool.
    expect(candidates.some(route => route.hops.length === 2 && route.hops[0].tokenOut.endsWith('SOL'))).toBe(true);
    expect(buildPoolCandidates(pools, WUGNOT, 'gno.land/r/none/x.X')).toEqual([]);
  });

  it('rejects a non-array pools payload but accepts an empty list', () => {
    expect(() => parsePools({ pools: [] }, TIERS)).toThrow(SwapDataError);
    expect(() => parsePools(undefined, TIERS)).toThrow(SwapDataError);
    expect(parsePools([], TIERS)).toEqual([]);
  });

  it('skips pools with unknown fee tiers or prices', () => {
    expect(parsePools([{ fee: '2500', price: '1', tokenA: { path: WUGNOT }, tokenB: { path: GNS } }, { fee: '3000', price: '-1', tokenA: { path: WUGNOT }, tokenB: { path: GNS } }], TIERS)).toEqual([]);
  });
});

describe('router qeval results', () => {
  it('parses DrySwapRoute amounts and surfaces router errors', () => {
    expect(parseDrySwapResult(qeval.drySwapSplit)).toEqual({ amountIn: '1000000', amountOut: '4151365' });
    expect(parseDrySwapResult(qeval.drySwapDevBtc)).toEqual({ amountIn: '1000000', amountOut: '59' });
    expect(parseDrySwapResult(qeval.drySwapExactOutSplit)).toEqual({ amountIn: '962929', amountOut: '4000000' });
    expect(parseDrySwapResult(qeval.drySwapExactOutDevUsdc)).toEqual({ amountIn: '1089764', amountOut: '1000000' });
    expect(() => parseDrySwapResult(qeval.drySwapExactOutTooMuch)).toThrow('too much spent');
    expect(() => parseDrySwapResult(qeval.drySwapMissingPool)).toThrow('pool does not exist');
    expect(() => parseDrySwapResult(qeval.drySwapTooFew)).toThrow('too few received');
    expect(() => parseDrySwapResult('("-1" string)\n("2" string)\n(undefined)')).toThrow('malformed amount');
    expect(() => parseDrySwapResult('')).toThrow(SwapDataError);
  });

  it('parses the router fee in basis points', () => {
    expect(parseSwapFee(qeval.getSwapFee)).toBe(15);
    expect(() => parseSwapFee('(1001 uint64)')).toThrow();
    expect(() => parseSwapFee('("15" string)')).toThrow();
  });
});
