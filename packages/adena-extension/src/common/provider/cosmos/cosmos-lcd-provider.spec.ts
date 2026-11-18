import { CosmosNetworkProfile } from 'adena-module';
import type { MockInstance } from 'vitest';

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
  let getAccountMock: MockInstance;
  let getBalanceMock: MockInstance;

  beforeEach(() => {
    getAccountMock = vi
      .spyOn(CosmosQueryClient.prototype, 'getAccount')
      .mockResolvedValue({
        address: 'atone1abc',
        accountNumber: '1',
        sequence: '2',
      });
    getBalanceMock = vi
      .spyOn(CosmosQueryClient.prototype, 'getBalance')
      .mockResolvedValue('1000');
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
      try {
        vi.setSystemTime(new Date('2026-04-21T00:00:00Z'));
        const provider = new CosmosLcdProvider(PROFILE);

        await provider.getAccount('atone1abc');
        vi.setSystemTime(new Date('2026-04-21T00:00:06Z'));
        await provider.getAccount('atone1abc');

        expect(getAccountMock).toHaveBeenCalledTimes(2);
      }
      finally {
        vi.useRealTimers();
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
      const broadcastSpy = vi
        .spyOn(CosmosQueryClient.prototype, 'broadcastTx')
        .mockResolvedValue({ txhash: 'HASH', code: 0, rawLog: '', height: '1' });

      const provider = new CosmosLcdProvider(PROFILE);
      await provider.broadcastTx(new Uint8Array([1]));
      await provider.broadcastTx(new Uint8Array([1]));

      expect(broadcastSpy).toHaveBeenCalledTimes(2);
    });
  });
});
