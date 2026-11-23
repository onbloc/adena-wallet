import { GnoTokenResourceRepository } from '../../../../../src/repositories/chain/gno/gno-token-resource.repository';
import { BUILT_IN_NETWORKS } from '../../../../../src/resources';
import { FakeHttpClient } from '../../../../helpers/fake-http';
import { RESOURCE_BASE } from '../../../../helpers/test-container';

const network = BUILT_IN_NETWORKS[0];
const BASE = 'https://res.example';
const NATIVE_URL = `${BASE}/gno-native/${network.id}.json`;
const GRC20_URL = `${BASE}/grc20/${network.id}.json`;

const grc20 = (overrides: Record<string, unknown> = {}) => ({
  name: 'Foo',
  symbol: 'FOO',
  decimals: 6,
  pkg_path: 'gno.land/r/demo/foo',
  ...overrides,
});

describe('GnoTokenResourceRepository', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('defaults to the published resource base url', async () => {
    const http = new FakeHttpClient();

    await new GnoTokenResourceRepository(http).get(network);
    expect(http.calls).toEqual([`${RESOURCE_BASE}/gno-native/${network.id}.json`, `${RESOURCE_BASE}/grc20/${network.id}.json`]);
  });

  it('overlays the native token and maps GRC20 items', async () => {
    const http = new FakeHttpClient()
      .on(NATIVE_URL, [
        { denom: 'other', name: 'X', symbol: 'X', decimals: 0, description: 'ignored' },
        { denom: 'ugnot', name: 'Gno', symbol: 'GNOT', decimals: 6, description: 'Native', website_url: 'https://gno.land', image: '/n.svg' },
      ])
      .on(GRC20_URL, [grc20({ image: '/foo.svg', description: 'Foo token', website_url: 'https://foo' })]);
    const { tokens, routes } = await new GnoTokenResourceRepository(http, BASE).get(network);

    expect(tokens[0]).toMatchObject({ id: 'ugnot', isNative: true, description: 'Native', websiteUrl: 'https://gno.land', imageUrl: `${BASE}/n.svg` });
    expect(tokens[1]).toEqual({
      id: 'gno.land/r/demo/foo.FOO',
      networkId: network.id,
      family: 'gno',
      type: 'grc20',
      name: 'Foo',
      symbol: 'FOO',
      decimals: 6,
      pkgPath: 'gno.land/r/demo/foo',
      imageUrl: `${BASE}/foo.svg`,
      description: 'Foo token',
      websiteUrl: 'https://foo',
      isNative: false,
    });
    expect(routes).toEqual({});
  });

  it('falls back to the bare native token when both lists fail', async () => {
    const { tokens, routes } = await new GnoTokenResourceRepository(new FakeHttpClient(), BASE).get(network);

    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ id: 'ugnot', description: undefined, websiteUrl: undefined, imageUrl: undefined });
    expect(routes).toEqual({});
  });

  it('skips items with invalid keys or decimals and keeps 0 / 18 decimals', async () => {
    const http = new FakeHttpClient().on(GRC20_URL, [
      grc20({ pkg_path: 'nopath' }),
      grc20({ decimals: 1.5 }),
      grc20({ decimals: '6' }),
      grc20({ symbol: 'ZERO', decimals: 0 }),
      grc20({ symbol: 'WEI', decimals: 18 }),
    ]);
    const { tokens } = await new GnoTokenResourceRepository(http, BASE).get(network);

    expect(tokens.slice(1).map(token => [token.symbol, token.decimals])).toEqual([['ZERO', 0], ['WEI', 18]]);
  });

  it('keeps only well-formed transfer routes', async () => {
    const http = new FakeHttpClient().on(GRC20_URL, [
      grc20({
        routes: {
          funcs: {
            transfer: { name: 'Transfer', args: ['$to', '$amount'] },
            lower: { name: 'transfer', args: [] },
            badArgs: { name: 'Approve', args: ['$to', 1] },
            noArgs: { name: 'Mint' },
            nullish: null,
          },
        },
      }),
      grc20({ symbol: 'NOFUNCS', routes: { other: true } }),
      grc20({ symbol: 'STRFUNCS', routes: { funcs: 'x' } }),
      grc20({ symbol: 'EMPTY', routes: { funcs: {} } }),
    ]);
    const { routes } = await new GnoTokenResourceRepository(http, BASE).get(network);

    expect(routes).toEqual({
      'gno.land/r/demo/foo.FOO': { transfer: { name: 'Transfer', args: ['$to', '$amount'] } },
      'gno.land/r/demo/foo.EMPTY': {},
    });
  });

  it('caches per network for ten minutes', async () => {
    let now = 1_000_000;

    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const http = new FakeHttpClient();
    const repository = new GnoTokenResourceRepository(http, BASE);
    const first = repository.get(network);

    expect(repository.get(network)).toBe(first);
    await first;
    now += 10 * 60 * 1000 - 1;
    expect(repository.get(network)).toBe(first);
    expect(http.calls).toHaveLength(2);

    now += 1;
    const refreshed = repository.get(network);

    expect(refreshed).not.toBe(first);
    await refreshed;
    expect(http.calls).toHaveLength(4);

    await repository.get(BUILT_IN_NETWORKS[1]);
    expect(http.calls).toHaveLength(6);
  });

  it('evicts failed loads so the next call retries', async () => {
    const http = new FakeHttpClient();
    const repository = new GnoTokenResourceRepository(http, BASE);
    const broken = { ...network, id: 'broken', nativeToken: { ...network.nativeToken, id: 'missing' } };

    await expect(repository.get(broken)).rejects.toThrow('native token missing is not defined');
    await Promise.resolve();
    await expect(repository.get(broken)).rejects.toThrow('native token missing is not defined');
  });
});
