import { CosmosLcdProvider } from '@common/provider/cosmos/cosmos-lcd-provider';
import { TokenProfile } from 'adena-module';
import { CosmosBalanceService } from './cosmos-balance';

const UATONE: TokenProfile = {
  id: 'atomone-1:uatone',
  chainProfileId: 'atomone-1',
  symbol: 'ATONE',
  name: 'AtomOne',
  decimals: 6,
  iconUrl: '/assets/icons/atone.svg',
  origin: { kind: 'cosmos-native', denom: 'uatone' },
  tags: ['native', 'staking', 'governance'],
};

const UPHOTON: TokenProfile = {
  id: 'atomone-1:uphoton',
  chainProfileId: 'atomone-1',
  symbol: 'PHOTON',
  name: 'Photon',
  decimals: 6,
  iconUrl: '/assets/icons/photon.svg',
  origin: { kind: 'cosmos-native', denom: 'uphoton' },
  tags: ['native', 'fee'],
};

const GNO_TOKEN: TokenProfile = {
  id: 'gnoland1:ugnot',
  chainProfileId: 'gnoland1',
  symbol: 'GNOT',
  name: 'Gno',
  decimals: 6,
  origin: { kind: 'gno-native', denom: 'ugnot' },
  tags: ['native', 'fee', 'staking'],
};

describe('CosmosBalanceService', () => {
  let service: CosmosBalanceService;
  let mockGetBalance: jest.Mock;
  let mockGetAllBalances: jest.Mock;

  beforeEach(() => {
    mockGetBalance = jest.fn();
    mockGetAllBalances = jest.fn();
    const mockProvider = {
      getBalance: mockGetBalance,
      getAllBalances: mockGetAllBalances,
    } as unknown as CosmosLcdProvider;
    service = new CosmosBalanceService(mockProvider);
  });

  describe('getTokenBalance', () => {
    it('returns TokenBalanceType for a cosmos-native token', async () => {
      mockGetBalance.mockResolvedValue('1000000');

      const result = await service.getTokenBalance('atone1abc', UATONE);

      expect(result).not.toBeNull();
      expect(result).toEqual({
        main: false,
        tokenId: 'atomone-1:uatone',
        networkId: 'atomone-1',
        display: true,
        type: 'cosmos-native',
        name: 'AtomOne',
        symbol: 'ATONE',
        decimals: 6,
        image: '/assets/icons/atone.svg',
        denom: 'uatone',
        amount: { value: '1', denom: 'ATONE' },
      });
      expect(mockGetBalance).toHaveBeenCalledWith('atone1abc', 'uatone');
    });

    it('converts decimals correctly for non-round amounts', async () => {
      mockGetBalance.mockResolvedValue('1234567');

      const result = await service.getTokenBalance('atone1abc', UATONE);

      expect(result?.amount.value).toBe('1.234567');
    });

    it('handles zero balance', async () => {
      mockGetBalance.mockResolvedValue('0');

      const result = await service.getTokenBalance('atone1abc', UATONE);

      expect(result?.amount.value).toBe('0');
    });

    it('returns null when provider returns null (network error)', async () => {
      mockGetBalance.mockResolvedValue(null);

      const result = await service.getTokenBalance('atone1abc', UATONE);

      expect(result).toBeNull();
    });

    it('returns null when CosmosProvider is not injected', async () => {
      const noProviderService = new CosmosBalanceService(null);

      const result = await noProviderService.getTokenBalance('atone1abc', UATONE);

      expect(result).toBeNull();
    });

    it('returns null for gno-native tokens', async () => {
      const result = await service.getTokenBalance('g1abc', GNO_TOKEN);

      expect(result).toBeNull();
      expect(mockGetBalance).not.toHaveBeenCalled();
    });

    it('sets main=false for cosmos tokens regardless of native/staking tags so they remain toggleable in Manage Tokens', async () => {
      mockGetBalance.mockResolvedValue('500000');

      const atone = await service.getTokenBalance('atone1abc', UATONE);
      const photon = await service.getTokenBalance('atone1abc', UPHOTON);

      expect(atone?.main).toBe(false);
      expect(photon?.main).toBe(false);
    });

    it('uses empty string when iconUrl is undefined', async () => {
      mockGetBalance.mockResolvedValue('100');
      const tokenWithoutIcon: TokenProfile = {
        ...UATONE,
        iconUrl: undefined,
      };

      const result = await service.getTokenBalance('atone1abc', tokenWithoutIcon);

      expect(result?.image).toBe('');
    });
  });

  describe('getTokenBalances', () => {
    it('returns balances for multiple cosmos tokens in a single request', async () => {
      mockGetAllBalances.mockResolvedValue([
        { denom: 'uatone', amount: '1000000' },
        { denom: 'uphoton', amount: '2000000' },
      ]);

      const results = await service.getTokenBalances('atone1abc', [UATONE, UPHOTON]);

      expect(results).toHaveLength(2);
      expect(results[0].symbol).toBe('ATONE');
      expect(results[0].amount.value).toBe('1');
      expect(results[1].symbol).toBe('PHOTON');
      expect(results[1].amount.value).toBe('2');
      expect(mockGetAllBalances).toHaveBeenCalledTimes(1);
      expect(mockGetAllBalances).toHaveBeenCalledWith('atone1abc');
      expect(mockGetBalance).not.toHaveBeenCalled();
    });

    it('reports a denom missing from the bank response as a zero balance', async () => {
      mockGetAllBalances.mockResolvedValue([{ denom: 'uatone', amount: '1000000' }]);

      const results = await service.getTokenBalances('atone1abc', [UATONE, UPHOTON]);

      expect(results).toHaveLength(2);
      expect(results[0].amount.value).toBe('1');
      expect(results[1].symbol).toBe('PHOTON');
      expect(results[1].amount.value).toBe('0');
    });

    it('filters out non-cosmos tokens', async () => {
      const results = await service.getTokenBalances('g1abc', [GNO_TOKEN]);

      expect(results).toHaveLength(0);
      expect(mockGetAllBalances).not.toHaveBeenCalled();
    });

    it('returns empty array when the request fails so the chain reads as unreachable', async () => {
      mockGetAllBalances.mockResolvedValue(null);

      const results = await service.getTokenBalances('atone1abc', [UATONE, UPHOTON]);

      expect(results).toHaveLength(0);
    });

    it('returns empty array when CosmosProvider is not injected', async () => {
      const noProviderService = new CosmosBalanceService(null);

      const results = await noProviderService.getTokenBalances('atone1abc', [UATONE]);

      expect(results).toHaveLength(0);
    });
  });
});
