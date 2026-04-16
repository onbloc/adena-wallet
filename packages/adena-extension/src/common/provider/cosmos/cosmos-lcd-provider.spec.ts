import axios from 'axios';
import { CosmosLcdProvider } from './cosmos-lcd-provider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CosmosLcdProvider', () => {
  const BASE_URL = 'https://atomone-api.allinbits.com';
  let provider: CosmosLcdProvider;
  let mockGet: jest.Mock;

  beforeEach(() => {
    mockGet = jest.fn();
    mockedAxios.create.mockReturnValue({ get: mockGet } as any);
    provider = new CosmosLcdProvider(BASE_URL);
  });

  describe('getBalance', () => {
    it('returns amount for a valid denom', async () => {
      mockGet.mockResolvedValue({
        data: { balance: { denom: 'uatone', amount: '1000000' } },
      });

      const result = await provider.getBalance('atone1abc', 'uatone');

      expect(result).toBe('1000000');
      expect(mockGet).toHaveBeenCalledWith(
        `${BASE_URL}/cosmos/bank/v1beta1/balances/atone1abc/by_denom`,
        { params: { denom: 'uatone' } },
      );
    });

    it('returns "0" when balance field has no amount', async () => {
      mockGet.mockResolvedValue({
        data: { balance: {} },
      });

      const result = await provider.getBalance('atone1abc', 'uatone');
      expect(result).toBe('0');
    });

    it('returns null on network error', async () => {
      mockGet.mockRejectedValue(new Error('Network Error'));

      const result = await provider.getBalance('atone1abc', 'uatone');
      expect(result).toBeNull();
    });

    it('returns null on timeout', async () => {
      mockGet.mockRejectedValue(new Error('timeout of 10000ms exceeded'));

      const result = await provider.getBalance('atone1abc', 'uatone');
      expect(result).toBeNull();
    });
  });

  describe('getAllBalances', () => {
    it('returns balances array on success', async () => {
      const balances = [
        { denom: 'uatone', amount: '1000000' },
        { denom: 'uphoton', amount: '500000' },
      ];
      mockGet.mockResolvedValue({ data: { balances } });

      const result = await provider.getAllBalances('atone1abc');

      expect(result).toEqual(balances);
      expect(mockGet).toHaveBeenCalledWith(
        `${BASE_URL}/cosmos/bank/v1beta1/balances/atone1abc`,
      );
    });

    it('returns empty array when balances field is missing', async () => {
      mockGet.mockResolvedValue({ data: {} });

      const result = await provider.getAllBalances('atone1abc');
      expect(result).toEqual([]);
    });

    it('returns null on network error', async () => {
      mockGet.mockRejectedValue(new Error('Network Error'));

      const result = await provider.getAllBalances('atone1abc');
      expect(result).toBeNull();
    });
  });

  describe('setBaseUrl', () => {
    it('updates the base URL for subsequent requests', async () => {
      const newUrl = 'https://new-api.example.com';
      provider.setBaseUrl(newUrl);

      mockGet.mockResolvedValue({
        data: { balance: { denom: 'uatone', amount: '999' } },
      });

      await provider.getBalance('atone1abc', 'uatone');

      expect(mockGet).toHaveBeenCalledWith(
        `${newUrl}/cosmos/bank/v1beta1/balances/atone1abc/by_denom`,
        { params: { denom: 'uatone' } },
      );
    });
  });
});
