import { API_URL, createTestContainer, RESOURCE_BASE, TEST_MNEMONIC, TEST_PASSWORD } from './helpers/test-container';

const PERUN = 'gno.land/r/demo/defi/grc20factory.PERUN';
const WUGNOT = 'gno.land/r/gnoland/wugnot.wugnot';

const setup = async () => {
  const env = createTestContainer();
  const account = await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
  const network = env.container.networkService.getCurrentNetwork();
  const address = env.container.accountService.getAddress(account, network);

  env.http
    .on(`${RESOURCE_BASE}/gno-native/gnoland-1.json`, [{ denom: 'ugnot', name: 'Gno.land', symbol: 'GNOT', decimals: 6, image: '/gno-native/images/ugnot.svg' }])
    .on(`${RESOURCE_BASE}/grc20/gnoland-1.json`, [{
      name: 'wGNOT',
      symbol: 'wugnot',
      decimals: 6,
      pkg_path: 'gno.land/r/gnoland/wugnot',
      image: '/grc20/images/wugnot.svg',
      routes: { funcs: { transfer: { name: 'Transfer', args: ['$to', '$amount'] } } },
    }])
    .on(`${API_URL}/v1/accounts/${address}`, {
      data: {
        address,
        assets: [
          { tokenType: 'GRC20', tokenId: `${PERUN}.0000001`, tokenKey: PERUN, packagePath: 'gno.land/r/demo/defi/grc20factory', name: 'Perun', symbol: 'PERUN', decimals: 6, amount: '5', logoUrl: null, address },
          { tokenType: 'NATIVE', tokenId: 'ugnot', packagePath: '', name: 'Gno.land', symbol: 'GNOT', decimals: 6, amount: '1', logoUrl: null, address },
        ],
      },
    })
    .on(`${API_URL}/v1/prices`, {
      data: {
        items: [
          { assetId: 'gno-land', provider: 'gnoswap', quoteCurrency: 'USD', price: '0.04', status: 'fresh', changeRateOneDay: 1 },
          { assetId: 'gno-land', provider: 'CMC', quoteCurrency: 'USD', price: '0.05', status: 'stale', changeRateOneDay: 0.71 },
          { assetId: PERUN, provider: 'gnoswap', quoteCurrency: 'USD', price: '2', status: 'unavailable', changeRateOneDay: null },
        ],
      },
    });
  env.gno.state.balances[address] = '2500000ugnot';
  // Registry metadata/balance queries return tuples in request order.
  env.gno.state.evaluate = (_pkg, expression): string => (expression.includes('BalanceOf')
    ? (expression.match(/Get\("/g) ?? []).map(() => '(true bool)\n(7000000 int64)').join('\n')
    : '("Perun" string)\n("PERUN" string)\n(6 int)');
  return { ...env, account, network, address };
};

describe('TokenService', () => {
  it('builds the token list from resources and API discovery, native first', async () => {
    const { container, account, network } = await setup();
    const tokens = await container.tokenService.getTokenList(account, network);

    expect(tokens.map(token => [token.id, token.source, token.visible])).toEqual([
      ['ugnot', 'default', true],
      [PERUN, 'discovered', true],
    ]);
    expect(tokens[0].imageUrl).toBe(`${RESOURCE_BASE}/gno-native/images/ugnot.svg`);
  });

  it('persists visibility choices across refreshes but never hides the native token', async () => {
    const { container, account, network } = await setup();

    await container.tokenService.getTokenList(account, network);
    container.tokenService.setVisibility(account, network, PERUN, false);
    container.tokenService.setVisibility(account, network, 'ugnot', false);
    const tokens = await container.tokenService.getTokenList(account, network);

    expect(tokens.find(token => token.id === PERUN)?.visible).toBe(false);
    expect(tokens.find(token => token.id === 'ugnot')?.visible).toBe(true);
  });

  it('adds a custom token after a registry lookup, overlaying curated metadata', async () => {
    const { container, account, network, gno } = await setup();

    gno.state.evaluate = (): string => '("Wrapped GNOT" string)\n("wugnot" string)\n(6 int)';
    const token = await container.tokenService.addCustomToken(account, network, WUGNOT);

    expect(token).toMatchObject({ id: WUGNOT, name: 'wGNOT', source: 'custom', imageUrl: `${RESOURCE_BASE}/grc20/images/wugnot.svg` });
  });

  it('reads native and GRC20 balances as exact strings', async () => {
    const { container, account, network } = await setup();
    const tokens = await container.tokenService.getTokenList(account, network);

    await expect(container.tokenService.getBalances(account, network, tokens)).resolves.toEqual({ ugnot: '2500000', [PERUN]: '7000000' });
  });

  it('builds GRC20 transfers from the curated route', async () => {
    const { container, account, network } = await setup();
    const wugnot = { id: WUGNOT, networkId: network.id, family: 'gno' as const, type: 'grc20' as const, name: 'wGNOT', symbol: 'wugnot', decimals: 6, pkgPath: 'gno.land/r/gnoland/wugnot', isNative: false };
    const draft = await container.transactionService.createTransferDraft({ account, network, token: wugnot, toAddress: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5', amount: '10' });

    expect(draft.messages[0]).toMatchObject({ type: '/vm.m_call', value: { pkg_path: 'gno.land/r/gnoland/wugnot', func: 'Transfer', args: ['g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5', '10'] } });
  });
});

describe('PriceService', () => {
  it('applies provider priority, bindings and quote decimals; drops unavailable quotes', async () => {
    const { container, network } = await setup();
    const native = { id: 'ugnot', networkId: network.id, family: 'gno' as const, type: 'native' as const, name: 'Gno.land', symbol: 'GNOT', decimals: 6, isNative: true };
    const wugnot = { ...native, id: WUGNOT, type: 'grc20' as const, isNative: false };
    const perun = { ...native, id: PERUN, type: 'grc20' as const, isNative: false };
    const prices = await container.priceService.getPrices([native, wugnot, perun], network);

    expect(prices['ugnot:gnoland-1']).toEqual({ tokenId: 'ugnot', networkId: 'gnoland-1', usd: 0.05, change24h: 0.71 });
    expect(prices[`${WUGNOT}:gnoland-1`].usd).toBe(0.05);
    expect(prices[`${PERUN}:gnoland-1`]).toBeUndefined();
  });

  it('is disabled on networks that are not priced', async () => {
    const { container } = await setup();
    const testnet = container.networkService.getNetwork('onyx-1');

    expect(container.priceService.isSupported(testnet)).toBe(false);
  });

  it('computes the portfolio total and its 24h change', () => {
    const { PriceService } = jest.requireActual('../src/services/price.service');
    const token = { id: 'ugnot', networkId: 'gnoland-1', decimals: 6 };
    const result = PriceService.portfolio([{ token, amount: '2000000' }], { 'ugnot:gnoland-1': { tokenId: 'ugnot', networkId: 'gnoland-1', usd: 1.1, change24h: 10 } });

    expect(result.usd).toBeCloseTo(2.2);
    expect(result.change24h).toBeCloseTo(10);
  });
});

describe('API response decoding', () => {
  it('reads double-wrapped payloads', async () => {
    const { container, account, network, http, address } = await setup();

    http.on(`${API_URL}/v1/accounts/${address}`, { data: { data: { assets: [] } } });
    const tokens = await container.tokenService.getTokenList(account, network);

    expect(tokens.map(token => token.id)).toEqual(['ugnot']);
  });
});
