import axios from 'axios';
import { CosmosLcdProvider } from './cosmos-lcd-provider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CosmosLcdProvider', () => {
  const BASE_URL = 'https://atomone-api.allinbits.com';
  let provider: CosmosLcdProvider;
  let mockGet: jest.Mock;
  let mockPost: jest.Mock;

  beforeEach(() => {
    mockGet = jest.fn();
    mockPost = jest.fn();
    mockedAxios.create.mockReturnValue({ get: mockGet, post: mockPost } as any);
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
      mockGet.mockResolvedValue({ data: { balance: {} } });

      const result = await provider.getBalance('atone1abc', 'uatone');
      expect(result).toBe('0');
    });

    it('returns null on network error', async () => {
      mockGet.mockRejectedValue(new Error('Network Error'));

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

  describe('getAccount', () => {
    it('returns BaseAccount fields', async () => {
      mockGet.mockResolvedValue({
        data: {
          account: {
            '@type': '/cosmos.auth.v1beta1.BaseAccount',
            address: 'atone1abc',
            account_number: '42',
            sequence: '7',
          },
        },
      });

      const result = await provider.getAccount('atone1abc');

      expect(result).toEqual({
        address: 'atone1abc',
        accountNumber: '42',
        sequence: '7',
      });
      expect(mockGet).toHaveBeenCalledWith(
        `${BASE_URL}/cosmos/auth/v1beta1/accounts/atone1abc`,
      );
    });

    it('unwraps base_account for wrapped account types (e.g. vesting)', async () => {
      mockGet.mockResolvedValue({
        data: {
          account: {
            '@type': '/cosmos.vesting.v1beta1.PeriodicVestingAccount',
            base_account: {
              address: 'atone1vest',
              account_number: '99',
              sequence: '3',
            },
          },
        },
      });

      const result = await provider.getAccount('atone1vest');

      expect(result).toEqual({
        address: 'atone1vest',
        accountNumber: '99',
        sequence: '3',
      });
    });

    it('falls back to 0/0 when fields are missing (fresh account)', async () => {
      mockGet.mockResolvedValue({
        data: {
          account: {
            '@type': '/cosmos.auth.v1beta1.BaseAccount',
          },
        },
      });

      const result = await provider.getAccount('atone1fresh');

      expect(result).toEqual({
        address: 'atone1fresh',
        accountNumber: '0',
        sequence: '0',
      });
    });
  });

  describe('broadcastTx', () => {
    it('posts base64-encoded tx_bytes and returns response on success', async () => {
      mockPost.mockResolvedValue({
        data: {
          tx_response: {
            txhash: 'ABCDEF',
            code: 0,
            raw_log: '',
            height: '100',
          },
        },
      });

      const txBytes = new Uint8Array([1, 2, 3, 4]);
      const result = await provider.broadcastTx(txBytes);

      expect(result).toEqual({
        txhash: 'ABCDEF',
        code: 0,
        rawLog: '',
        height: '100',
      });
      expect(mockPost).toHaveBeenCalledWith(
        `${BASE_URL}/cosmos/tx/v1beta1/txs`,
        {
          tx_bytes: Buffer.from(txBytes).toString('base64'),
          mode: 'BROADCAST_MODE_SYNC',
        },
      );
    });

    it('uses the provided broadcast mode', async () => {
      mockPost.mockResolvedValue({
        data: { tx_response: { txhash: 'XYZ', code: 0, raw_log: '', height: '1' } },
      });

      await provider.broadcastTx(new Uint8Array([9]), 'BROADCAST_MODE_ASYNC');

      expect(mockPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ mode: 'BROADCAST_MODE_ASYNC' }),
      );
    });

    it('throws with raw_log when code is non-zero', async () => {
      mockPost.mockResolvedValue({
        data: {
          tx_response: {
            txhash: 'FAILHASH',
            code: 32,
            raw_log: 'account sequence mismatch',
            height: '0',
          },
        },
      });

      await expect(provider.broadcastTx(new Uint8Array([1]))).rejects.toThrow(
        /code=32.*account sequence mismatch/,
      );
    });
  });
});
