import { stringToBase64, TM2Error, Tx, uint8ArrayToBase64 } from '@gnolang/tm2-js-client';
import { HttpClient } from '@gnolang/tm2-rpc';

import { GnoProvider } from './gno-provider';

type RpcRequest = { method: string; params: Record<string, unknown> };

const PRIMARY = 'https://rpc.example';
const FALLBACK = 'https://rpc.fallback';

// Every call goes through tm2-rpc's HttpClient; this stands in for the node.
const mockNode = (reply: (request: RpcRequest, url: string) => unknown) =>
  vi
    .spyOn(HttpClient.prototype, 'execute')
    .mockImplementation(async function (this: HttpClient, request) {
      const url = (this as unknown as { url: string }).url;
      const result = await reply(request as unknown as RpcRequest, url);
      return { jsonrpc: '2.0', id: request.id, result } as never;
    });

const abciQueryResult = (data: string | null, value: string | null = null) => ({
  response: {
    ResponseBase: { Error: null, Data: data, Events: null, Log: '', Info: '' },
    Key: null,
    Value: value,
    Proof: null,
    Height: '0',
  },
});

describe('GnoProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendTransactionSync', () => {
    it('returns the broadcast tx hash as lowercase hex', async () => {
      // The node answers with a base64 hash; the wallet uses hex.
      const base64Hash = '2dD/aBpjSdCTwYdaF64b+bekuBdenwWbYezWfn3JHWE=';
      const hexHash = 'd9d0ff681a6349d093c1875a17ae1bf9b7a4b8175e9f059b61ecd67e7dc91d61';
      const execute = mockNode(() => ({ error: null, data: null, log: '', hash: base64Hash }));

      const provider = new GnoProvider(PRIMARY, 'test-13');
      const result = await provider.sendTransactionSync('AQID');

      expect(result).toEqual({ error: null, data: null, Log: '', hash: hexHash });
      expect(execute.mock.calls[0][0]).toMatchObject({
        method: 'broadcast_tx_sync',
        params: { tx: 'AQID' },
      });
    });

    it('throws a TM2Error carrying the chain log when CheckTx fails', async () => {
      mockNode(() => ({
        error: { '@type': '/std.InsufficientFundsError' },
        data: null,
        log: 'insufficient funds to pay for fees',
        hash: '2dD/aBpjSdCTwYdaF64b+bekuBdenwWbYezWfn3JHWE=',
      }));

      const provider = new GnoProvider(PRIMARY, 'test-13');
      const error = await provider.sendTransactionSync('AQID').catch(e => e);

      expect(error).toBeInstanceOf(TM2Error);
      expect(error.message).toBe('broadcast_tx_sync failed: /std.InsufficientFundsError');
      expect(error.log).toBe('insufficient funds to pay for fees');
    });

    it('surfaces a JSON-RPC error by its message', async () => {
      vi.spyOn(HttpClient.prototype, 'execute').mockRejectedValue(
        new Error(JSON.stringify({ code: -32603, message: 'tx already exists in cache', data: '' })),
      );

      const provider = new GnoProvider(PRIMARY, 'test-13');

      await expect(provider.sendTransactionSync('AQID')).rejects.toThrow(/^tx already exists in cache$/);
    });
  });

  describe('getSessions', () => {
    it('returns an empty list when chain returns JSON null data', async () => {
      const execute = mockNode(() => abciQueryResult(stringToBase64('null')));

      const provider = new GnoProvider(PRIMARY, 'test-13');
      const sessions = await provider.getSessions('g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5');

      expect(sessions).toEqual([]);
      expect(execute.mock.calls[0][0]).toMatchObject({
        method: 'abci_query',
        params: { path: 'auth/accounts/g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5/sessions', data: '' },
      });
    });

    it('returns an empty list when chain returns an empty JSON array', async () => {
      mockNode(() => abciQueryResult(stringToBase64('[]')));

      const provider = new GnoProvider(PRIMARY, 'test-13');
      const sessions = await provider.getSessions('g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5');

      expect(sessions).toEqual([]);
    });

    it('retries on the fallback endpoint when the primary one is unreachable', async () => {
      const urls: string[] = [];
      mockNode((_, url) => {
        urls.push(url);
        if (url === PRIMARY) {
          throw new TypeError('Failed to fetch');
        }
        return abciQueryResult(stringToBase64('[]'));
      });

      const provider = new GnoProvider(PRIMARY, 'test-13', FALLBACK);
      const sessions = await provider.getSessions('g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5');

      expect(sessions).toEqual([]);
      expect(urls).toEqual([PRIMARY, FALLBACK]);
    });
  });

  describe('getSession', () => {
    it('returns null instead of throwing when the chain has no such session', async () => {
      mockNode(() => ({
        response: {
          ...abciQueryResult(null).response,
          ResponseBase: {
            Error: { '@type': '/std.UnknownRequestError' },
            Data: null,
            Events: null,
            Log: 'session not found',
            Info: '',
          },
        },
      }));

      const provider = new GnoProvider(PRIMARY, 'test-13');

      await expect(provider.getSession('g1master', 'g1session')).resolves.toBeNull();
    });
  });

  describe('getGasPriceRatio', () => {
    it('divides the price amount by the gas', async () => {
      mockNode(() => abciQueryResult(stringToBase64('{"gas":1000,"price":"100ugnot"}')));

      const provider = new GnoProvider(PRIMARY, 'test-13');

      await expect(provider.getGasPriceRatio()).resolves.toBe(0.1);
    });

    it('returns 0 when the node is unreachable', async () => {
      mockNode(() => {
        throw new TypeError('Failed to fetch');
      });

      const provider = new GnoProvider(PRIMARY, 'test-13');

      await expect(provider.getGasPriceRatio()).resolves.toBe(0);
    });
  });

  describe('simulateTx', () => {
    it('sends the amino-encoded tx bytes, base64-encoded once', async () => {
      const execute = mockNode(() => abciQueryResult(null, null));
      const provider = new GnoProvider(PRIMARY, 'test-13');
      const tx: Tx = { messages: [], fee: undefined, signatures: [], memo: 'simulate' };

      await expect(provider.simulateTx(tx)).rejects.toThrow('Failed to estimate gas');
      // The previous direct call sent the same base64 string as a positional param.
      expect(execute.mock.calls[0][0]).toMatchObject({
        method: 'abci_query',
        params: { path: '.app/simulate', data: uint8ArrayToBase64(Tx.encode(tx).finish()), prove: false },
      });
    });
  });

  describe('getRealmDocument', () => {
    it('queries vm/qdoc with the package path', async () => {
      const execute = mockNode(() => abciQueryResult(stringToBase64('{"package_path":"gno.land/r/demo"}')));
      const provider = new GnoProvider(PRIMARY, 'test-13');

      await expect(provider.getRealmDocument('gno.land/r/demo')).resolves.toEqual({
        package_path: 'gno.land/r/demo',
      });
      expect(execute.mock.calls[0][0]).toMatchObject({
        params: { path: 'vm/qdoc', data: stringToBase64('gno.land/r/demo') },
      });
    });
  });

  // The replies below are verbatim `vm/qeval` output from gno.land mainnet for
  // `gno.land/r/gnoswap/gnft`.
  describe('evaluateFunction', () => {
    const makeProvider = (response: string): GnoProvider => {
      const provider = new GnoProvider('https://rpc.example', 'test-13');
      vi.spyOn(provider, 'evaluateExpression').mockResolvedValue(response);
      return provider;
    };

    it('reads a lone string result', async () => {
      const provider = makeProvider('("GNOSWAP NFT" string)');

      await expect(provider.evaluateFunction('gno.land/r/gnoswap/gnft', 'Name')).resolves.toEqual({
        value: 'GNOSWAP NFT',
        rest: '',
      });
    });

    it('reads a (string, error) result and keeps the nil error tuple', async () => {
      const provider = makeProvider('("ipfs://cid/1.png" string)\n(undefined)');

      await expect(
        provider.evaluateFunction('gno.land/r/gnoswap/gnft', 'TokenURI', ['1']),
      ).resolves.toEqual({ value: 'ipfs://cid/1.png', rest: '(undefined)' });
    });

    it('reads a (string, error) result whose error is a struct literal', async () => {
      const provider = makeProvider(
        '("" string)\n(&(struct{("token has no uri" string)} errors.errorString) *errors.errorString)',
      );

      await expect(
        provider.evaluateFunction('gno.land/r/gnoswap/gnft', 'TokenURI', ['999999']),
      ).resolves.toEqual({
        value: '',
        rest: '(&(struct{("token has no uri" string)} errors.errorString) *errors.errorString)',
      });
    });

    // `.uverse.address` is not a bare word; the previous regex-based decoder
    // skipped the tuple entirely and reported no value.
    it('reads a value whose type token carries dots', async () => {
      const provider = makeProvider(
        '("g1q6d4ns7zkr492rgl0pcgf5ajaf2dlz0nnptky3" .uverse.address)\n(undefined)',
      );

      await expect(
        provider.getValueByEvaluateExpression('gno.land/r/gnoswap/gnft', 'OwnerOf', ['1']),
      ).resolves.toBe('g1q6d4ns7zkr492rgl0pcgf5ajaf2dlz0nnptky3');
    });

    it('escapes string arguments instead of splicing them in raw', async () => {
      const provider = makeProvider('("" string)');
      const evaluateExpression = vi.spyOn(provider, 'evaluateExpression');

      await provider.evaluateFunction('gno.land/r/gnoswap/gnft', 'TokenURI', ['a"b']);

      expect(evaluateExpression).toHaveBeenCalledWith(
        'gno.land/r/gnoswap/gnft',
        'TokenURI("a\\"b")',
      );
    });

    it('reads a nil result as null rather than the string "undefined"', async () => {
      const provider = makeProvider('(undefined)');

      await expect(
        provider.getValueByEvaluateExpression('gno.land/r/gnoswap/gnft', 'OwnerOf', ['1']),
      ).resolves.toBeNull();
    });

    it('returns null when the node call fails', async () => {
      const provider = new GnoProvider('https://rpc.example', 'test-13');
      vi.spyOn(provider, 'evaluateExpression').mockRejectedValue(new Error('boom'));

      await expect(
        provider.evaluateFunction('gno.land/r/gnoswap/gnft', 'Name'),
      ).resolves.toBeNull();
    });
  });
});
