import { BUILT_IN_NETWORKS, DEFAULT_NETWORK_ID, EXPLORE_APPS, getDefaultTokensFor, getGrc20RegistryConfig, getNativeTokenFor, PRICE_CONFIG } from '../src/resources';

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

  it('lists https-only explore apps for Gno', () => {
    expect(EXPLORE_APPS.length).toBeGreaterThan(0);
    EXPLORE_APPS.forEach(app => expect(app.url.startsWith('https://')).toBe(true));
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
