import {
  BUILT_IN_NETWORKS,
  DEFAULT_NETWORK_ID,
  DEX_API_CONFIG,
  EXPLORE_APPS,
  getDefaultTokensFor,
  getGrc20RegistryConfig,
  getNativeTokenFor,
  ONRAMP_CONFIG,
  PRICE_CONFIG,
  toOnrampConfig,
} from '../src/resources';

describe('bundled resources', () => {
  it('defines https Gno and AtomOne networks with resolvable coins', () => {
    expect(BUILT_IN_NETWORKS.map(network => `${network.family}:${network.id}`))
      .toEqual(['gno:gnoland-1', 'gno:onyx-1', 'gno:gnoswap', 'cosmos:atomone-1', 'cosmos:atomone-testnet-1']);
    expect(DEFAULT_NETWORK_ID).toBe('gnoland-1');
    BUILT_IN_NETWORKS.forEach(network => expect(network.rpcUrl.startsWith('https://')).toBe(true));
    const [gno, , gnoswap, atomone] = BUILT_IN_NETWORKS;

    // GnoSwap Dev has no REST API: tokens come from the registry, NFTs/history are unavailable.
    expect(gnoswap).toMatchObject({ chainId: 'dev.gnoswap', rpcUrl: 'https://dev.rpc.gnoswap.io', apiUrl: undefined, isMainnet: false });
    expect(getNativeTokenFor(gno)).toMatchObject({ id: 'ugnot', symbol: 'GNOT', localIcon: 'gnot' });
    expect(gno.feeToken.denom).toBe('ugnot');
    expect(getDefaultTokensFor(atomone).map(token => token.symbol)).toEqual(['ATONE', 'PHOTON']);
    expect(atomone).toMatchObject({ addressPrefix: 'atone', restUrl: 'https://atomone-api.allinbits.com', feeToken: { denom: 'uphoton' } });
  });

  it('falls back to the default grc20 registry config for unknown chains', () => {
    expect(getGrc20RegistryConfig('unknown').registries[0].path).toBe('gno.land/r/nt/grc20reg/v0');
  });

  it('only prices networks it has bindings for', () => {
    expect(PRICE_CONFIG.pricedNetworkIds).toEqual(['gnoland-1', 'atomone-1']);
    expect(PRICE_CONFIG.bindings['uatone:atomone-1'].assetId).toBe('atomone');
    expect(PRICE_CONFIG.bindings['ugnot:gnoland-1'].assetId).toBe('gno-land');
  });

  it('bundles the wrapped market path for native GNOT', () => {
    expect(DEX_API_CONFIG['gnoland-1'].wrappedPaths).toEqual({ ugnot: 'gno.land/r/gnoland/wugnot.wugnot' });
  });

  it('lists https-only explore apps for Gno', () => {
    expect(EXPLORE_APPS.length).toBeGreaterThan(0);
    EXPLORE_APPS.forEach(app => expect(app.url.startsWith('https://')).toBe(true));
  });
});

describe('onramp providers', () => {
  const valid = {
    id: 'fixture',
    name: 'Fixture Pay',
    paymentMethods: ['Debit card', 'Apple Pay'],
    urlTemplate: 'https://buy.example/?wallet={address}&amount={amount}&fiat={currency}&asset={asset}',
    assets: { 'gnoland-1:ugnot': 'GNOT' },
  };
  const parse = (overrides: Record<string, unknown>) => () => toOnrampConfig({ providers: [{ ...valid, ...overrides }] });

  it('ships an empty provider list until providers are chosen', () => {
    expect(ONRAMP_CONFIG).toEqual({ providers: [] });
  });

  it('accepts a well-formed provider', () => {
    expect(toOnrampConfig({ providers: [valid] }).providers).toEqual([valid]);
  });

  it('rejects malformed documents and providers', () => {
    expect(() => toOnrampConfig({})).toThrow('onramp providers must be an array');
    expect(() => toOnrampConfig(null)).toThrow('onramp providers must be an array');
    expect(() => toOnrampConfig({ providers: [valid, valid] })).toThrow('onramp provider ids must be unique');
    expect(parse({ id: '' })).toThrow('needs an id');
    expect(parse({ name: ' ' })).toThrow('needs a name');
    expect(parse({ paymentMethods: [1] })).toThrow('paymentMethods must be strings');
    expect(parse({ assets: [] })).toThrow('assets must be an object');
    expect(parse({ assets: { ugnot: 'GNOT' } })).toThrow('must be "<networkId>:<tokenId>"');
    expect(parse({ assets: { 'gnoland-1:ugnot': '' } })).toThrow('needs a code');
  });

  it('accepts only https templates with known placeholders', () => {
    expect(parse({ urlTemplate: 'http://buy.example/?a={asset}' })).toThrow('urlTemplate must be https');
    expect(parse({ urlTemplate: 'https://{address}.example' })).toThrow('urlTemplate must be https');
    expect(parse({ urlTemplate: 'https://buy.example/?k={apiKey}' })).toThrow('unknown placeholder {apiKey}');
    expect(parse({ urlTemplate: 'https://buy.example/?a={asset' })).toThrow('unbalanced braces');
  });

  it('rejects placeholders or userinfo in the host', () => {
    ['https://pay{asset}.example/', 'https://good.com@evil.com/', 'https://{address}@evil.com/', 'https://user:pass@buy.example/',
      'https://buy.example:{amount}/', 'https://buy.example\\@evil.com/', 'https:/buy.example/', 'https://buy.example/ ?a={asset}']
      .forEach(urlTemplate => expect(parse({ urlTemplate })).toThrow('urlTemplate must be https'));
  });

  it('accepts placeholders in the path, query and fragment', () => {
    ['https://buy.example/{asset}/buy?to={address}#amount={amount}', 'https://Buy.Example:8443/?fiat={currency}']
      .forEach(urlTemplate => expect(parse({ urlTemplate })).not.toThrow());
  });
});

describe('feature flags', () => {
  it('hides AtomOne networks until the cosmos module is enabled', () => {
    const { FEATURES } = jest.requireActual('../src/config/features');
    const { createContainer } = jest.requireActual('../src/di/container');
    const { MemorySecureStore } = jest.requireActual('../src/security/memory-secure-store');
    const { MemoryKeyValueStore } = jest.requireActual('../src/storage/memory-key-value-store');
    const container = createContainer({ secureStore: new MemorySecureStore(), keyValueStore: new MemoryKeyValueStore() });
    const families = new Set(container.networkService.getNetworks().map((network: { family: string }) => network.family));

    expect(FEATURES.atomone).toBe(false);
    expect([...families]).toEqual(['gno']);
  });
});
