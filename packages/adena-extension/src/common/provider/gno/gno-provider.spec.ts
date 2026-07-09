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
    it('returns the broadcast tx hash as canonical base64, not uppercase hex', async () => {
      // Regression guard: sendTransactionSync must hand dApps the same base64 hash
      // the tm2-js-client path produced. A direct broadcast previously ran the hash
      // through base64->hex, which changed the value returned to callers.
      const base64Hash = '2dD/aBpjSdCTwYdaF64b+bekuBdenwWbYezWfn3JHWE=';
      axiosPostMock.mockResolvedValue({
        data: { result: { error: null, data: null, log: '', hash: base64Hash } },
      });

      const provider = new GnoProvider('https://rpc.example', 'test-13');
      const result = await provider.sendTransactionSync('encoded-tx');

      expect(result.hash).toBe(base64Hash);
      expect(result.hash).not.toMatch(/^[0-9A-Fa-f]{64}$/);
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
