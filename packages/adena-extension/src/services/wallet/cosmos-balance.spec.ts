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

  beforeEach(() => {
    mockGetBalance = jest.fn();
    const mockProvider = { getBalance: mockGetBalance } as unknown as CosmosLcdProvider;
    service = new CosmosBalanceService(mockProvider);
  });

  describe('getTokenBalance', () => {
    it('returns TokenBalanceType for a cosmos-native token', async () => {
      mockGetBalance.mockResolvedValue('1000000');

      const result = await service.getTokenBalance('atone1abc', UATONE);

      expect(result).not.toBeNull();
      expect(result).toEqual({
        main: true,
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

    it('returns null for gno-native tokens', async () => {
      const result = await service.getTokenBalance('g1abc', GNO_TOKEN);

      expect(result).toBeNull();
      expect(mockGetBalance).not.toHaveBeenCalled();
    });

    it('sets main=true for tokens with staking tag', async () => {
      mockGetBalance.mockResolvedValue('500000');

      const result = await service.getTokenBalance('atone1abc', UATONE);

      expect(result?.main).toBe(true);
    });

    it('sets main=false for tokens without staking tag (e.g. fee-only tokens like PHOTON)', async () => {
      mockGetBalance.mockResolvedValue('500000');

      const result = await service.getTokenBalance('atone1abc', UPHOTON);

      expect(result?.main).toBe(false);
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
    it('returns balances for multiple cosmos tokens', async () => {
      mockGetBalance
        .mockResolvedValueOnce('1000000')
        .mockResolvedValueOnce('2000000');

      const results = await service.getTokenBalances('atone1abc', [UATONE, UPHOTON]);

      expect(results).toHaveLength(2);
      expect(results[0].symbol).toBe('ATONE');
      expect(results[1].symbol).toBe('PHOTON');
    });

    it('filters out tokens that fail to fetch', async () => {
      mockGetBalance
        .mockResolvedValueOnce('1000000')
        .mockResolvedValueOnce(null);

      const results = await service.getTokenBalances('atone1abc', [UATONE, UPHOTON]);

      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('ATONE');
    });

    it('filters out non-cosmos tokens', async () => {
      const results = await service.getTokenBalances('g1abc', [GNO_TOKEN]);

      expect(results).toHaveLength(0);
      expect(mockGetBalance).not.toHaveBeenCalled();
    });

    it('returns empty array when all fetches fail', async () => {
      mockGetBalance.mockResolvedValue(null);

      const results = await service.getTokenBalances('atone1abc', [UATONE, UPHOTON]);

      expect(results).toHaveLength(0);
    });
  });
});
