import { stringToBase64 } from '@gnolang/tm2-js-client';
import axios from 'axios';
import { GnoProvider } from './gno-provider';
import { postABCIResponse } from './utils';

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  postABCIResponse: jest.fn(),
}));

jest.mock('axios');

describe('GnoProvider', () => {
  const postABCIResponseMock = postABCIResponse as jest.Mock;
  const axiosPostMock = axios.post as jest.Mock;

  beforeEach(() => {
    postABCIResponseMock.mockReset();
    axiosPostMock.mockReset();
  });

  describe('sendTransactionSync', () => {
    it('returns the broadcast tx hash as lowercase hex', async () => {
      // The node answers with a base64 hash; the wallet uses hex.
      const base64Hash = '2dD/aBpjSdCTwYdaF64b+bekuBdenwWbYezWfn3JHWE=';
      const hexHash = 'd9d0ff681a6349d093c1875a17ae1bf9b7a4b8175e9f059b61ecd67e7dc91d61';
      axiosPostMock.mockResolvedValue({
        data: { result: { error: null, data: null, log: '', hash: base64Hash } },
      });

      const provider = new GnoProvider('https://rpc.example', 'test-13');
      const result = await provider.sendTransactionSync('encoded-tx');

      expect(result.hash).toBe(hexHash);
    });
  });

  describe('getSessions', () => {
    it('returns an empty list when chain returns JSON null data', async () => {
      postABCIResponseMock.mockResolvedValue(makeABCIResponse(stringToBase64('null')));

      const provider = new GnoProvider('https://rpc.example', 'test-13');
      const sessions = await provider.getSessions('g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5');

      expect(sessions).toEqual([]);
    });

    it('returns an empty list when chain returns an empty JSON array', async () => {
      postABCIResponseMock.mockResolvedValue(makeABCIResponse(stringToBase64('[]')));

      const provider = new GnoProvider('https://rpc.example', 'test-13');
      const sessions = await provider.getSessions('g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5');

      expect(sessions).toEqual([]);
    });

    it('retries on the fallback endpoint when the primary one is unreachable', async () => {
      postABCIResponseMock.mockImplementation(async (url: string) => {
        if (url === 'https://rpc.example') {
          throw new TypeError('Failed to fetch');
        }
        return makeABCIResponse(stringToBase64('[]'));
      });

      const provider = new GnoProvider('https://rpc.example', 'test-13', 'https://rpc.fallback');
      const sessions = await provider.getSessions('g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5');

      expect(sessions).toEqual([]);
      expect(postABCIResponseMock.mock.calls.map(([url]) => url)).toEqual([
        'https://rpc.example',
        'https://rpc.fallback',
      ]);
    });
  });

  // The replies below are verbatim `vm/qeval` output from gno.land mainnet for
  // `gno.land/r/gnoswap/gnft`.
  describe('evaluateFunction', () => {
    const makeProvider = (response: string): GnoProvider => {
      const provider = new GnoProvider('https://rpc.example', 'test-13');
      jest.spyOn(provider, 'evaluateExpression').mockResolvedValue(response);
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
      const evaluateExpression = jest.spyOn(provider, 'evaluateExpression');

      await provider.evaluateFunction('gno.land/r/gnoswap/gnft', 'TokenURI', ['a"b']);

      expect(evaluateExpression).toHaveBeenCalledWith(
        'gno.land/r/gnoswap/gnft',
        'TokenURI("a\\"b")',
      );
    });

    it('returns null when the node call fails', async () => {
      const provider = new GnoProvider('https://rpc.example', 'test-13');
      jest.spyOn(provider, 'evaluateExpression').mockRejectedValue(new Error('boom'));

      await expect(
        provider.evaluateFunction('gno.land/r/gnoswap/gnft', 'Name'),
      ).resolves.toBeNull();
    });
  });
});

function makeABCIResponse(data: string): object {
  return {
    result: {
      response: {
        ResponseBase: {
          Data: data,
        },
      },
    },
  };
}
