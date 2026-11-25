import { toBase64 } from '@cosmjs/encoding';

import { Token } from '../../../../../src/domain/token';
import { OnblocApiClient } from '../../../../../src/infrastructure/http/onbloc-api.client';
import { GnoAssetRepository } from '../../../../../src/repositories/chain/gno/gno-asset.repository';
import { GnoGrc20Registry } from '../../../../../src/repositories/chain/gno/gno-grc20-registry';
import { GnoTokenResourceRepository } from '../../../../../src/repositories/chain/gno/gno-token-resource.repository';
import { BUILT_IN_NETWORKS, getNativeTokenFor } from '../../../../../src/resources';
import { createFakeGnoProvider } from '../../../../helpers/fake-gno-provider';
import { FakeHttpClient } from '../../../../helpers/fake-http';

const network = BUILT_IN_NETWORKS[0];
const API = network.apiUrl!;
const BASE = 'https://res.example';
const ADDRESS = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const FOO = 'gno.land/r/demo/foo.FOO';
const native = getNativeTokenFor(network);
const fooToken: Token = { id: FOO, networkId: network.id, family: 'gno', type: 'grc20', name: 'Foo', symbol: 'FOO', decimals: 6, pkgPath: 'gno.land/r/demo/foo', isNative: false };

const asset = (overrides: Record<string, unknown> = {}) => ({
  address: ADDRESS,
  amount: '5',
  decimals: 6,
  logoUrl: null,
  name: 'Foo',
  packagePath: 'gno.land/r/demo/foo',
  symbol: 'FOO',
  tokenType: 'GRC20',
  tokenId: `${FOO}.0000001`,
  tokenKey: FOO,
  ...overrides,
});

const setup = () => {
  const gno = createFakeGnoProvider();
  const http = new FakeHttpClient();
  const repository = new GnoAssetRepository(
    gno.factory,
    new GnoTokenResourceRepository(http, BASE),
    new GnoGrc20Registry(gno.factory),
    new OnblocApiClient(http),
  );

  return { gno, http, repository };
};

const withCurated = (http: FakeHttpClient, items: unknown[]) => http.on(`${BASE}/grc20/${network.id}.json`, items);

describe('GnoAssetRepository', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is the gno family and lists curated tokens', async () => {
    const { repository, http } = setup();

    withCurated(http, [{ name: 'Curated Foo', symbol: 'FOO', decimals: 6, pkg_path: 'gno.land/r/demo/foo' }]);
    expect(repository.family).toBe('gno');
    expect((await repository.getCuratedTokens(network)).map(token => token.id)).toEqual(['ugnot', FOO]);
  });

  describe('findToken', () => {
    it('returns the native token without a query', async () => {
      const { repository, gno } = setup();

      gno.state.evaluate = () => {
        throw new Error('should not query');
      };

      await expect(repository.findToken('ugnot', network)).resolves.toEqual(native);
    });

    it('returns null for keys that are not registry keys', async () => {
      await expect(setup().repository.findToken('gno.land/r/demo/foo', network)).resolves.toBeNull();
    });

    it('returns null when the registry does not know the token', async () => {
      const { repository, gno } = setup();

      gno.state.evaluate = () => '("" string)\n("" string)\n(0 int)';
      await expect(repository.findToken(FOO, network)).resolves.toBeNull();
    });

    it('overlays curated metadata on the on-chain token', async () => {
      const { repository, gno, http } = setup();

      gno.state.evaluate = () => '("Chain Foo" string)\n("FOO" string)\n(6 int)';
      withCurated(http, [{ name: 'Curated Foo', symbol: 'FOO', decimals: 6, pkg_path: 'gno.land/r/demo/foo', image: '/foo.svg' }]);
      await expect(repository.findToken(FOO, network)).resolves.toMatchObject({ id: FOO, name: 'Curated Foo', imageUrl: `${BASE}/foo.svg` });
    });

    it('keeps on-chain metadata for uncurated tokens', async () => {
      const { repository, gno } = setup();

      gno.state.evaluate = () => '("Chain Foo" string)\n("FOO" string)\n(18 int)';
      await expect(repository.findToken(FOO, network)).resolves.toEqual({ ...fooToken, name: 'Chain Foo', decimals: 18 });
    });
  });

  describe('searchRegistry', () => {
    it('returns a page of overlaid tokens with the total', async () => {
      const { repository, gno, http } = setup();

      withCurated(http, [{ name: 'Curated Foo', symbol: 'FOO', decimals: 6, pkg_path: 'gno.land/r/demo/foo' }]);
      gno.state.evaluate = (_, expression) => (expression.includes('IterateByOffset')
        ? `(2 int)\n("${FOO},gno.land/r/demo/bar.BAR," string)`
        : '("Foo" string)\n("FOO" string)\n(6 int)\n("Bar" string)\n("BAR" string)\n(2 int)');
      const page = await repository.searchRegistry(network, 0, 10);

      expect(page.total).toBe(2);
      expect(page.tokens.map(token => [token.id, token.name])).toEqual([[FOO, 'Curated Foo'], ['gno.land/r/demo/bar.BAR', 'Bar']]);
    });

    it('returns an empty page past the end', async () => {
      const { repository, gno } = setup();

      gno.state.evaluate = () => '(2 int)\n("" string)';
      await expect(repository.searchRegistry(network, 10, 10)).resolves.toEqual({ tokens: [], total: 2 });
    });
  });

  describe('discoverHeldTokens', () => {
    it('discovers nothing without an API', async () => {
      const { repository, http } = setup();

      await expect(repository.discoverHeldTokens(ADDRESS, { ...network, apiUrl: undefined })).resolves.toEqual([]);
      expect(http.calls).toHaveLength(0);
    });

    it('maps GRC20 assets, overlays curated data and drops unusable ids', async () => {
      const { repository, http } = setup();

      withCurated(http, [{ name: 'Curated Foo', symbol: 'FOO', decimals: 6, pkg_path: 'gno.land/r/demo/foo' }]);
      http.on(`${API}/v1/accounts/${ADDRESS}`, {
        data: {
          assets: [
            asset(),
            asset({ tokenType: 'grc20', tokenKey: undefined, tokenId: 'gno.land/r/demo/bar.BAR.0000003', packagePath: '', name: 'Bar', symbol: 'BAR', decimals: 0, logoUrl: 'https://img/bar.png' }),
            asset({ tokenType: 'NATIVE', tokenKey: undefined, tokenId: 'ugnot' }),
            asset({ tokenKey: undefined, tokenId: 'garbage' }),
          ],
        },
      });
      const tokens = await repository.discoverHeldTokens(ADDRESS, network);

      expect(tokens).toEqual([
        { ...fooToken, name: 'Curated Foo', imageUrl: undefined, description: undefined, websiteUrl: undefined },
        {
          id: 'gno.land/r/demo/bar.BAR',
          networkId: network.id,
          family: 'gno',
          type: 'grc20',
          name: 'Bar',
          symbol: 'BAR',
          decimals: 0,
          pkgPath: 'gno.land/r/demo/bar',
          imageUrl: 'https://img/bar.png',
          isNative: false,
        },
      ]);
    });

    it('handles an empty asset list', async () => {
      const { repository, http } = setup();

      http.on(`${API}/v1/accounts/${ADDRESS}`, { data: {} });
      await expect(repository.discoverHeldTokens(ADDRESS, network)).resolves.toEqual([]);
    });

    it('propagates API failures', async () => {
      await expect(setup().repository.discoverHeldTokens(ADDRESS, network)).rejects.toThrow('404');
    });
  });

  describe('getBalances', () => {
    it('returns {} without querying for no tokens', async () => {
      const { repository, gno } = setup();

      gno.state.evaluate = () => {
        throw new Error('should not query');
      };

      await expect(repository.getBalances(ADDRESS, [], network)).resolves.toEqual({});
    });

    it('reads native balances from JSON-encoded coin strings', async () => {
      const { repository, gno } = setup();

      gno.state.balances[ADDRESS] = '5foo,123456789012345678901234567890ugnot';
      await expect(repository.getBalances(ADDRESS, [native], network)).resolves.toEqual({ ugnot: '123456789012345678901234567890' });
    });

    it('reads bare coin strings from older nodes', async () => {
      const { repository, gno } = setup();

      (gno.provider as unknown as { abciQuery: unknown }).abciQuery = async () => ({
        response: { ResponseBase: { Data: toBase64(new TextEncoder().encode('42ugnot')) } },
      });
      await expect(repository.getBalances(ADDRESS, [native], network)).resolves.toEqual({ ugnot: '42' });
    });

    it('reports 0 for empty or missing data', async () => {
      const { repository, gno } = setup();

      await expect(repository.getBalances(ADDRESS, [native], network)).resolves.toEqual({ ugnot: '0' });
      (gno.provider as unknown as { abciQuery: unknown }).abciQuery = async () => ({ response: { ResponseBase: { Data: null } } });
      await expect(repository.getBalances(ADDRESS, [native, { ...native, id: 'uother', denom: 'uother' }], network)).resolves.toEqual({ ugnot: '0', uother: '0' });
    });

    it('reads GRC20 balances from the registry and defaults unknown tokens to 0', async () => {
      const { repository, gno } = setup();
      const bar = { ...fooToken, id: 'gno.land/r/demo/bar.BAR' };

      gno.state.balances[ADDRESS] = '7ugnot';
      gno.state.evaluate = () => '(true bool)\n(99 int64)\n(false bool)\n(0 int64)';
      await expect(repository.getBalances(ADDRESS, [native, fooToken, bar], network)).resolves.toEqual({ ugnot: '7', [FOO]: '99', [bar.id]: '0' });
    });
  });

  describe('buildTransferMessages', () => {
    const params = { network, fromAddress: ADDRESS, toAddress: 'g1to', amount: '1000' };

    it('sends native coins with MsgSend', async () => {
      await expect(setup().repository.buildTransferMessages({ ...params, token: native })).resolves.toEqual([
        { type: '/bank.MsgSend', value: { from_address: ADDRESS, to_address: 'g1to', amount: '1000ugnot' } },
      ]);
    });

    it('uses the curated transfer route', async () => {
      const { repository, http } = setup();

      withCurated(http, [{ name: 'Foo', symbol: 'FOO', decimals: 6, pkg_path: 'gno.land/r/demo/foo', routes: { funcs: { transfer: { name: 'SafeTransfer', args: ['$to', '$amount'] } } } }]);
      await expect(repository.buildTransferMessages({ ...params, token: fooToken })).resolves.toEqual([{
        type: '/vm.m_call',
        value: { caller: ADDRESS, send: '', max_deposit: '', pkg_path: 'gno.land/r/demo/foo', func: 'SafeTransfer', args: ['g1to', '1000'] },
      }]);
    });

    it('derives the package path from the token id when missing', async () => {
      const { repository, http } = setup();

      withCurated(http, [{ name: 'Foo', symbol: 'FOO', decimals: 6, pkg_path: 'gno.land/r/demo/foo', routes: { funcs: { transfer: { name: 'Transfer', args: ['$to', '$amount'] } } } }]);
      const [message] = await repository.buildTransferMessages({ ...params, token: { ...fooToken, pkgPath: undefined } });

      expect(message).toMatchObject({ type: '/vm.m_call', value: { pkg_path: 'gno.land/r/demo/foo' } });
    });

    it('falls back to a registry MsgRun without a route or when resources fail', async () => {
      const { repository } = setup();
      const [message] = await repository.buildTransferMessages({ ...params, token: fooToken });

      expect(message.type).toBe('/vm.m_run');
      expect(message.type === '/vm.m_run' && message.value.package.files[0].body).toContain(`grc20reg0.Transfer(0, cur, "${FOO}", address("g1to"), 1000)`);

      const failing = setup();

      jest.spyOn(GnoTokenResourceRepository.prototype, 'get').mockRejectedValueOnce(new Error('offline'));
      await expect(failing.repository.buildTransferMessages({ ...params, token: fooToken })).resolves.toMatchObject([{ type: '/vm.m_run' }]);
    });

    it('uses an empty package path for unparseable ids without pkgPath', async () => {
      const { repository, http } = setup();
      const odd = { ...fooToken, id: 'weird', pkgPath: undefined };

      http.on(`${BASE}/grc20/${network.id}.json`, []);
      jest.spyOn(GnoTokenResourceRepository.prototype, 'get').mockResolvedValueOnce({ tokens: [], complete: true, routes: { weird: { transfer: { name: 'Transfer', args: ['$to'] } } } });
      await expect(repository.buildTransferMessages({ ...params, token: odd })).resolves.toMatchObject([{ type: '/vm.m_call', value: { pkg_path: '' } }]);
    });
  });
});
