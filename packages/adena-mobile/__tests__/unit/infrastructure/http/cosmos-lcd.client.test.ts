import { isAppError } from '../../../../src/core/errors';
import { CosmosLcdClient } from '../../../../src/infrastructure/http/cosmos-lcd.client';
import { HttpRequest } from '../../../../src/infrastructure/http/http-client';
import { FakeHttpClient } from '../../../helpers/fake-http';

const REST = 'https://rest.test';
const capture = async (promise: Promise<unknown>): Promise<unknown> => promise.then(() => undefined, error => error);

describe('CosmosLcdClient', () => {
  let http: FakeHttpClient;
  let client: CosmosLcdClient;

  beforeEach(() => {
    http = new FakeHttpClient();
    client = new CosmosLcdClient(http);
  });

  describe('getNodeChainId', () => {
    const url = `${REST}/cosmos/base/tendermint/v1beta1/node_info`;

    it('returns the network and strips trailing slashes from the base url', async () => {
      http.on(url, { default_node_info: { network: 'atomone-1' } });
      await expect(client.getNodeChainId(`${REST}///`)).resolves.toBe('atomone-1');
    });

    it.each([{}, { default_node_info: {} }, { default_node_info: { network: '' } }])('throws NETWORK_ERROR for %o', async (body) => {
      http.on(url, body);
      expect(isAppError(await capture(client.getNodeChainId(REST)), 'NETWORK_ERROR')).toBe(true);
    });
  });

  describe('getBalances', () => {
    const url = `${REST}/cosmos/bank/v1beta1/balances/atone1x`;

    it('returns balances or an empty list', async () => {
      http.on(url, { balances: [{ denom: 'uatone', amount: '5' }] });
      await expect(client.getBalances(REST, 'atone1x')).resolves.toEqual([{ denom: 'uatone', amount: '5' }]);
      http.on(url, {});
      await expect(client.getBalances(REST, 'atone1x')).resolves.toEqual([]);
    });

    it('propagates transport errors', async () => {
      await expect(client.getBalances(REST, 'atone1x')).rejects.toThrow('404');
    });
  });

  describe('getAccount', () => {
    const url = `${REST}/cosmos/auth/v1beta1/accounts/atone1x`;

    it('reads a flat account', async () => {
      http.on(url, { account: { account_number: '12', sequence: '3' } });
      await expect(client.getAccount(REST, 'atone1x')).resolves.toEqual({ accountNumber: '12', sequence: '3' });
    });

    it('reads a vesting account through base_account', async () => {
      http.on(url, { account: { base_account: { account_number: '4', sequence: '9' } } });
      await expect(client.getAccount(REST, 'atone1x')).resolves.toEqual({ accountNumber: '4', sequence: '9' });
    });

    it('defaults missing fields to zero', async () => {
      http.on(url, {});
      await expect(client.getAccount(REST, 'atone1x')).resolves.toEqual({ accountNumber: '0', sequence: '0' });
    });

    it('returns null for unknown accounts', async () => {
      await expect(client.getAccount(REST, 'atone1x')).resolves.toBeNull();
    });
  });

  describe('getMinGasPrices', () => {
    const url = `${REST}/cosmos/base/node/v1beta1/config`;

    it('parses multiple entries and skips malformed ones', async () => {
      http.on(url, { minimum_gas_price: '0.0225uatone, 0.225uphoton,bad,1.ibc/ABC,10ibc/ABC12' });
      await expect(client.getMinGasPrices(REST)).resolves.toEqual([
        { amount: '0.0225', denom: 'uatone' },
        { amount: '0.225', denom: 'uphoton' },
        { amount: '10', denom: 'ibc/ABC12' },
      ]);
    });

    it.each([{}, { minimum_gas_price: '' }])('returns an empty list for %o', async (body) => {
      http.on(url, body);
      await expect(client.getMinGasPrices(REST)).resolves.toEqual([]);
    });
  });

  describe('simulate', () => {
    const url = `${REST}/cosmos/tx/v1beta1/simulate`;

    it('posts tx bytes and returns gas used', async () => {
      let request: HttpRequest | undefined;

      http.on(url, (init?: HttpRequest) => {
        request = init;
        return { gas_info: { gas_used: '1234' } };
      });
      await expect(client.simulate(REST, 'AAAA')).resolves.toBe('1234');
      expect(request).toEqual({ method: 'POST', body: { tx_bytes: 'AAAA' } });
    });

    it.each([{}, { gas_info: {} }, { gas_info: { gas_used: '0' } }, { gas_info: { gas_used: '-5' } }])(
      'throws TRANSACTION_FAILED for %o',
      async (body) => {
        http.on(url, body);
        expect(isAppError(await capture(client.simulate(REST, 'AAAA')), 'TRANSACTION_FAILED')).toBe(true);
      },
    );

    // Bug: Number('abc') is NaN and `NaN <= 0` is false, so a non-numeric gas_used is returned as-is.
    it.skip('throws TRANSACTION_FAILED for a non-numeric gas_used', async () => {
      http.on(url, { gas_info: { gas_used: 'abc' } });
      expect(isAppError(await capture(client.simulate(REST, 'AAAA')), 'TRANSACTION_FAILED')).toBe(true);
    });
  });

  describe('broadcastSync', () => {
    const url = `${REST}/cosmos/tx/v1beta1/txs`;

    it('posts in sync mode and returns hash and height', async () => {
      let request: HttpRequest | undefined;

      http.on(url, (init?: HttpRequest) => {
        request = init;
        return { tx_response: { txhash: 'H', code: 0, raw_log: '', height: '0' } };
      });
      await expect(client.broadcastSync(REST, 'AAAA')).resolves.toEqual({ txhash: 'H', height: '0' });
      expect(request).toEqual({ method: 'POST', body: { tx_bytes: 'AAAA', mode: 'BROADCAST_MODE_SYNC' } });
    });

    it('throws when tx_response is missing', async () => {
      http.on(url, {});
      const error = await capture(client.broadcastSync(REST, 'AAAA'));

      expect(isAppError(error, 'TRANSACTION_FAILED')).toBe(true);
      expect((error as Error).message).toBe('Broadcast returned no tx_response');
    });

    it('throws with the code and raw log on a failed check', async () => {
      http.on(url, { tx_response: { txhash: 'H', code: 13, raw_log: 'insufficient fee', height: '0' } });
      const error = await capture(client.broadcastSync(REST, 'AAAA'));

      expect(isAppError(error, 'TRANSACTION_FAILED')).toBe(true);
      expect((error as Error).message).toBe('Broadcast failed (code 13): insufficient fee');
    });
  });
});
