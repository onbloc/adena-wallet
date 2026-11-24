import { AppContainer, createContainer, Infrastructure, Services } from '../../../src/di/container';
import { ChainFamily, Network } from '../../../src/domain/network';
import { createGnoModule } from '../../../src/repositories/chain/gno/gno-module';
import { MemorySecureStore } from '../../../src/security/memory-secure-store';
import { ScryptXChaChaVaultCipher } from '../../../src/security/vault-cipher';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';
import { createFakeGnoProvider } from '../../helpers/fake-gno-provider';
import { FakeHttpClient } from '../../helpers/fake-http';

const SERVICE_KEYS: (keyof Services)[] = [
  'walletService', 'accountService', 'networkService', 'balanceService', 'tokenService', 'priceService',
  'marketDataService', 'nftService', 'activityService', 'addressBookService', 'exploreService', 'onrampService', 'appResetService',
  'transactionService', 'preferenceService', 'migrationService',
];

const network = (family: ChainFamily): Network => ({ family } as Network);

const baseInfra = (): Infrastructure => ({ secureStore: new MemorySecureStore(), keyValueStore: new MemoryKeyValueStore() });

const hasModule = (container: AppContainer, family: ChainFamily): boolean => {
  try {
    container.chainRegistry.module(network(family));
    return true;
  }
  catch {
    return false;
  }
};

describe('createContainer', () => {
  it('wires every service from platform defaults', () => {
    const container = createContainer(baseInfra());

    SERVICE_KEYS.forEach(key => expect(container[key]).toBeDefined());
    expect(container.keyringSession).toBeDefined();
    expect(hasModule(container, ChainFamily.GNO)).toBe(true);
    expect(hasModule(container, ChainFamily.COSMOS)).toBe(false);
  });

  it('uses injected chain modules, http, cipher, price and market repositories', async () => {
    const gno = createFakeGnoProvider();
    const http = new FakeHttpClient();
    const priceRepository = { isSupported: jest.fn(() => true), getPrices: jest.fn(async () => []) };
    const marketDataRepository = { isSupported: jest.fn(() => true), getMarketData: jest.fn(async () => ({}) as never), getTokenInfo: jest.fn(async () => ({}) as never) };
    const container = createContainer({
      ...baseInfra(),
      http,
      vaultCipher: new ScryptXChaChaVaultCipher({ N: 2 ** 10, r: 8, p: 1 }),
      chainModules: [createGnoModule({ providerFactory: gno.factory, http })],
      priceRepository,
      marketDataRepository,
      now: () => 0,
    });

    expect(hasModule(container, ChainFamily.GNO)).toBe(true);
    expect(container.priceService).toBeDefined();
    expect(container.marketDataService).toBeDefined();
  });

  it('passes an injected onramp config to the onramp service', () => {
    const provider = { id: 'p', name: 'P', paymentMethods: [], urlTemplate: 'https://p.example/?a={asset}', assets: { 'gno-test:ugnot': 'GNOT' } };
    const container = createContainer({ ...baseInfra(), onrampConfig: { providers: [provider] } });

    expect(container.onrampService.getProviders({ id: 'gno-test' } as Network, 'ugnot')).toEqual([provider]);
    expect(createContainer(baseInfra()).onrampService.getProviders({ id: 'gnoland-1' } as Network, 'ugnot')).toEqual([]);
  });

  it('prefers every service override', () => {
    const overrides = Object.fromEntries(SERVICE_KEYS.map(key => [key, { marker: key }])) as unknown as Services;
    const container = createContainer(baseInfra(), overrides);

    SERVICE_KEYS.forEach(key => expect(container[key]).toBe(overrides[key]));
  });

  it('registers the cosmos module when the atomone feature is on', () => {
    jest.isolateModules(() => {
      jest.doMock('../../../src/config/features', () => ({ FEATURES: { atomone: true } }));
      const isolated = jest.requireActual<typeof import('../../../src/di/container')>('../../../src/di/container');
      const container = isolated.createContainer(baseInfra());

      expect(() => container.chainRegistry.module(network(ChainFamily.COSMOS))).not.toThrow();
    });
  });
});
