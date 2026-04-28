import { CosmosNetworkProfile } from 'adena-module';
import { CosmosLcdProvider } from './cosmos-lcd-provider';
import { CosmosQueryClient } from './cosmos-query-client';

const PROFILE: CosmosNetworkProfile = {
  id: 'atomone-1',
  chainId: 'atomone-1',
  chainType: 'cosmos',
  chainGroup: 'atomone',
  displayName: 'AtomOne',
  chainIconUrl: '/assets/icons/atone.svg',
  isMainnet: true,
  nativeTokenId: 'atomone-1:uatone',
  rpcEndpoints: ['https://rpc.example.com'],
  restEndpoints: ['https://api.example.com'],
};

describe('CosmosLcdProvider', () => {
  let getAccountMock: jest.SpyInstance;
  let getBalanceMock: jest.SpyInstance;

  beforeEach(() => {
    getAccountMock = jest
      .spyOn(CosmosQueryClient.prototype, 'getAccount')
      .mockResolvedValue({
        address: 'atone1abc',
        accountNumber: '1',
        sequence: '2',
      });
    getBalanceMock = jest
      .spyOn(CosmosQueryClient.prototype, 'getBalance')
      .mockResolvedValue('1000');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('throws when restEndpoints is empty', () => {
      expect(
        () => new CosmosLcdProvider({ ...PROFILE, restEndpoints: [] }),
      ).toThrow(/restEndpoints empty/);
    });

    it('strips trailing slash from the first endpoint', async () => {
      const provider = new CosmosLcdProvider({
        ...PROFILE,
        restEndpoints: ['https://api.example.com/'],
      });
      await provider.getAccount('atone1abc');
      expect(getAccountMock).toHaveBeenCalledWith(
        'https://api.example.com',
        'atone1abc',
      );
    });
  });

  describe('debounce', () => {
    it('returns cached promise when called again within 5 seconds', async () => {
      const provider = new CosmosLcdProvider(PROFILE);

      await provider.getAccount('atone1abc');
      await provider.getAccount('atone1abc');

      expect(getAccountMock).toHaveBeenCalledTimes(1);
    });

    it('differentiates by address', async () => {
      const provider = new CosmosLcdProvider(PROFILE);

      await provider.getAccount('atone1abc');
      await provider.getAccount('atone1xyz');

      expect(getAccountMock).toHaveBeenCalledTimes(2);
    });

    it('differentiates by denom for getBalance', async () => {
      const provider = new CosmosLcdProvider(PROFILE);

      await provider.getBalance('atone1abc', 'uatone');
      await provider.getBalance('atone1abc', 'uphoton');

      expect(getBalanceMock).toHaveBeenCalledTimes(2);
    });

    it('re-fetches after 5-second window elapses', async () => {
      jest.useFakeTimers({ doNotFake: ['setImmediate'] });
      try {
        jest.setSystemTime(new Date('2026-04-21T00:00:00Z'));
        const provider = new CosmosLcdProvider(PROFILE);

        await provider.getAccount('atone1abc');
        jest.setSystemTime(new Date('2026-04-21T00:00:06Z'));
        await provider.getAccount('atone1abc');

        expect(getAccountMock).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('invalidate', () => {
    it('drops the debounce cache so the next call refetches', async () => {
      const provider = new CosmosLcdProvider(PROFILE);

      await provider.getAccount('atone1abc');
      provider.invalidate();
      await provider.getAccount('atone1abc');

      expect(getAccountMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('broadcastTx', () => {
    it('is not debounced (always hits the network)', async () => {
      const broadcastSpy = jest
        .spyOn(CosmosQueryClient.prototype, 'broadcastTx')
        .mockResolvedValue({ txhash: 'HASH', code: 0, rawLog: '', height: '1' });

      const provider = new CosmosLcdProvider(PROFILE);
      await provider.broadcastTx(new Uint8Array([1]));
      await provider.broadcastTx(new Uint8Array([1]));

      expect(broadcastSpy).toHaveBeenCalledTimes(2);
    });
  });
});
