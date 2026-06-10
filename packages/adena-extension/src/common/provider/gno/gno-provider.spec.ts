import { stringToBase64 } from '@gnolang/tm2-js-client';
import { GnoProvider } from './gno-provider';
import { postABCIResponse } from './utils';

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  postABCIResponse: jest.fn(),
}));

describe('GnoProvider', () => {
  const postABCIResponseMock = postABCIResponse as jest.Mock;

  beforeEach(() => {
    postABCIResponseMock.mockReset();
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
