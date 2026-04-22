import axios from 'axios';
import {
  CosmosQueryClient,
  parseMinimumGasPriceString,
} from './cosmos-query-client';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CosmosQueryClient', () => {
  const ENDPOINT = 'https://atomone-api.allinbits.com';
  let client: CosmosQueryClient;
  let mockGet: jest.Mock;
  let mockPost: jest.Mock;

  beforeEach(() => {
    mockGet = jest.fn();
    mockPost = jest.fn();
    mockedAxios.create.mockReturnValue({ get: mockGet, post: mockPost } as any);
    client = new CosmosQueryClient();
  });

  describe('getBalance', () => {
    it('returns amount for a valid denom', async () => {
      mockGet.mockResolvedValue({
        data: { balance: { denom: 'uatone', amount: '1000000' } },
      });

      const result = await client.getBalance(ENDPOINT, 'atone1abc', 'uatone');

      expect(result).toBe('1000000');
      expect(mockGet).toHaveBeenCalledWith(
        `${ENDPOINT}/cosmos/bank/v1beta1/balances/atone1abc/by_denom`,
        { params: { denom: 'uatone' } },
      );
    });

    it('returns "0" when balance field has no amount', async () => {
      mockGet.mockResolvedValue({ data: { balance: {} } });

      const result = await client.getBalance(ENDPOINT, 'atone1abc', 'uatone');
      expect(result).toBe('0');
    });

    it('returns null on network error', async () => {
      mockGet.mockRejectedValue(new Error('Network Error'));

      const result = await client.getBalance(ENDPOINT, 'atone1abc', 'uatone');
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

      const result = await client.getAllBalances(ENDPOINT, 'atone1abc');

      expect(result).toEqual(balances);
      expect(mockGet).toHaveBeenCalledWith(
        `${ENDPOINT}/cosmos/bank/v1beta1/balances/atone1abc`,
      );
    });

    it('returns empty array when balances field is missing', async () => {
      mockGet.mockResolvedValue({ data: {} });

      const result = await client.getAllBalances(ENDPOINT, 'atone1abc');
      expect(result).toEqual([]);
    });

    it('returns null on network error', async () => {
      mockGet.mockRejectedValue(new Error('Network Error'));

      const result = await client.getAllBalances(ENDPOINT, 'atone1abc');
      expect(result).toBeNull();
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

      const result = await client.getAccount(ENDPOINT, 'atone1abc');

      expect(result).toEqual({
        address: 'atone1abc',
        accountNumber: '42',
        sequence: '7',
      });
      expect(mockGet).toHaveBeenCalledWith(
        `${ENDPOINT}/cosmos/auth/v1beta1/accounts/atone1abc`,
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

      const result = await client.getAccount(ENDPOINT, 'atone1vest');

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

      const result = await client.getAccount(ENDPOINT, 'atone1fresh');

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
      const result = await client.broadcastTx(ENDPOINT, txBytes);

      expect(result).toEqual({
        txhash: 'ABCDEF',
        code: 0,
        rawLog: '',
        height: '100',
      });
      expect(mockPost).toHaveBeenCalledWith(
        `${ENDPOINT}/cosmos/tx/v1beta1/txs`,
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

      await client.broadcastTx(
        ENDPOINT,
        new Uint8Array([9]),
        'BROADCAST_MODE_ASYNC',
      );

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

      await expect(
        client.broadcastTx(ENDPOINT, new Uint8Array([1])),
      ).rejects.toThrow(/code=32.*account sequence mismatch/);
    });

    it('throws when tx_response is missing', async () => {
      mockPost.mockResolvedValue({ data: {} });

      await expect(
        client.broadcastTx(ENDPOINT, new Uint8Array([1])),
      ).rejects.toThrow(/no tx_response/);
    });
  });

  describe('getMinGasPrices', () => {
    it('parses the comma-joined minimum_gas_price string', async () => {
      mockGet.mockResolvedValue({
        data: {
          minimum_gas_price:
            '0.022500000000000000uatone,0.225000000000000000uphoton',
        },
      });

      const result = await client.getMinGasPrices(ENDPOINT);

      expect(mockGet).toHaveBeenCalledWith(
        `${ENDPOINT}/cosmos/base/node/v1beta1/config`,
      );
      expect(result).toEqual([
        { denom: 'uatone', amount: '0.022500000000000000' },
        { denom: 'uphoton', amount: '0.225000000000000000' },
      ]);
    });

    it('returns [] when the field is empty or missing', async () => {
      mockGet.mockResolvedValue({ data: { minimum_gas_price: '' } });
      expect(await client.getMinGasPrices(ENDPOINT)).toEqual([]);

      mockGet.mockResolvedValue({ data: {} });
      expect(await client.getMinGasPrices(ENDPOINT)).toEqual([]);
    });
  });

  describe('simulateTx', () => {
    it('returns numeric gas_used on success', async () => {
      mockPost.mockResolvedValue({
        data: { gas_info: { gas_used: '135000' } },
      });

      const result = await client.simulateTx(ENDPOINT, new Uint8Array([1, 2]));

      expect(result).toEqual({ gasUsed: 135_000 });
      expect(mockPost).toHaveBeenCalledWith(
        `${ENDPOINT}/cosmos/tx/v1beta1/simulate`,
        expect.objectContaining({ tx_bytes: expect.any(String) }),
      );
    });

    it('throws when gas_info.gas_used is missing or invalid', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });
      await expect(
        client.simulateTx(ENDPOINT, new Uint8Array([1])),
      ).rejects.toThrow(/no gas_info/);

      mockPost.mockResolvedValueOnce({
        data: { gas_info: { gas_used: 'abc' } },
      });
      await expect(
        client.simulateTx(ENDPOINT, new Uint8Array([1])),
      ).rejects.toThrow(/invalid gas_used/);
    });
  });
});

describe('parseMinimumGasPriceString', () => {
  it('returns an empty array for empty input', () => {
    expect(parseMinimumGasPriceString('')).toEqual([]);
  });

  it('parses a single-entry value', () => {
    expect(parseMinimumGasPriceString('0.025uphoton')).toEqual([
      { denom: 'uphoton', amount: '0.025' },
    ]);
  });

  it('parses a comma-joined multi-entry value and trims whitespace', () => {
    expect(
      parseMinimumGasPriceString(' 0.0225uatone , 0.225uphoton '),
    ).toEqual([
      { denom: 'uatone', amount: '0.0225' },
      { denom: 'uphoton', amount: '0.225' },
    ]);
  });

  it('throws on a malformed entry', () => {
    expect(() => parseMinimumGasPriceString('nodenom')).toThrow(/Unparseable/);
    expect(() => parseMinimumGasPriceString('0.01')).toThrow(/Unparseable/);
  });
});
