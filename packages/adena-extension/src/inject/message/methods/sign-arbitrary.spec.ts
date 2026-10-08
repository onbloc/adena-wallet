// Stub out `@adena-wallet/sdk` to avoid loading @web3auth's native crypto,
// which fails under jsdom's Uint8Array. Handlers use the enum values as
// plain strings.
jest.mock('@adena-wallet/sdk', () => ({
  WalletResponseFailureType: {
    INVALID_FORMAT: 'INVALID_FORMAT',
    ACCOUNT_MISMATCH: 'ACCOUNT_MISMATCH',
  },
  WalletResponseRejectType: {
    SIGN_REJECTED: 'SIGN_REJECTED',
  },
  WalletMessageInfo: {
    INVALID_FORMAT: {
      code: 4001,
      status: 'failure',
      type: 'INVALID_FORMAT',
      message: 'The requested transaction format is invalid.',
    },
    ACCOUNT_MISMATCH: {
      code: 4002,
      status: 'failure',
      type: 'ACCOUNT_MISMATCH',
      message: 'The account does not match.',
    },
    SIGN_REJECTED: {
      code: 4000,
      status: 'failure',
      type: 'SIGN_REJECTED',
      message: 'The signature has been rejected by the user.',
    },
  },
}));

const mockCreatePopup = jest.fn();
jest.mock('..', () => ({
  HandlerMethod: {
    createPopup: (...args: unknown[]): unknown => mockCreatePopup(...args),
  },
}));

import { InjectionMessage } from '../message';
import { InjectCore } from './core';
import { signArbitrary } from './transaction';

const SIGNER = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const OTHER = 'g1vcq3xd966wryuk9pmgfy7r2c8r02sm957zv9en';

// `getCurrentAccount` resolves undefined when the wallet is locked, which is
// how the locked case is expressed here.
function makeCore(currentAddress?: string): InjectCore {
  return {
    getInMemoryKey: jest.fn().mockResolvedValue(currentAddress ? {} : null),
    getCurrentAccount: jest
      .fn()
      .mockResolvedValue(
        currentAddress ? { getAddress: jest.fn().mockResolvedValue(currentAddress) } : undefined,
      ),
  } as unknown as InjectCore;
}

function makeRequest(data: unknown): InjectionMessage {
  return {
    code: 0,
    key: 'request-key',
    type: 'SIGN_ARBITRARY' as never,
    status: 'request',
    message: '',
    data: data as Record<string, unknown>,
    hostname: 'example.com',
    protocol: 'https:',
  };
}

describe('signArbitrary', () => {
  beforeEach(() => {
    mockCreatePopup.mockClear();
  });

  it('opens the approval window for a well-formed request', async () => {
    const sendResponse = jest.fn();
    await signArbitrary(
      makeCore(SIGNER),
      makeRequest({ signer: SIGNER, data: 'hello' }),
      sendResponse,
    );

    expect(mockCreatePopup).toHaveBeenCalledTimes(1);
    expect(mockCreatePopup.mock.calls[0][0]).toBe('/approve/wallet/sign-arbitrary');
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it('arms the window with a SIGN_REJECTED close message', async () => {
    await signArbitrary(
      makeCore(SIGNER),
      makeRequest({ signer: SIGNER, data: 'hello' }),
      jest.fn(),
    );

    const closeMessage = mockCreatePopup.mock.calls[0][2] as InjectionMessage;
    expect(closeMessage.type).toBe('SIGN_REJECTED');
    expect(closeMessage.key).toBe('request-key');
  });

  // The executor narrows params too, but a page can post to the content script
  // directly, so the handler is what keeps extra fields out of the popup URL.
  it('carries only the validated fields into the approval window', async () => {
    const request = {
      ...makeRequest({ signer: SIGNER, data: 'hello', padding: 'x'.repeat(100_000) }),
      extra: 'x'.repeat(100_000),
    };
    await signArbitrary(makeCore(SIGNER), request, jest.fn());

    const popupRequest = mockCreatePopup.mock.calls[0][1] as InjectionMessage;
    expect(popupRequest.data).toEqual({ signer: SIGNER, data: 'hello' });
    expect(popupRequest).not.toHaveProperty('extra');
    expect(popupRequest).toMatchObject({
      key: 'request-key',
      type: 'SIGN_ARBITRARY',
      hostname: 'example.com',
      protocol: 'https:',
    });
  });

  // A window claiming that signing proves control of an address the user does
  // not hold is misleading even briefly, so it must never be shown.
  it('refuses a signer the user does not hold, without opening a window', async () => {
    const sendResponse = jest.fn();
    await signArbitrary(
      makeCore(OTHER),
      makeRequest({ signer: SIGNER, data: 'hello' }),
      sendResponse,
    );

    expect(mockCreatePopup).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledTimes(1);
    expect(sendResponse.mock.calls[0][0]).toMatchObject({
      type: 'ACCOUNT_MISMATCH',
      key: 'request-key',
    });
  });

  // A locked wallet cannot resolve an account here, so this opens the window
  // and answers nothing. The approval page repeats the check after unlock,
  // which it is only reached to do because `approve-login` routes
  // SIGN_ARBITRARY back to it.
  it('opens the approval window and answers nothing when no account can be resolved', async () => {
    const sendResponse = jest.fn();
    await signArbitrary(makeCore(), makeRequest({ signer: SIGNER, data: 'hello' }), sendResponse);

    expect(mockCreatePopup).toHaveBeenCalledTimes(1);
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing message', { signer: SIGNER }],
    ['an empty message', { signer: SIGNER, data: '' }],
    ['an address that is not bech32', { signer: 'nope', data: 'hello' }],
    ['no params at all', undefined],
  ])('answers INVALID_FORMAT for %s, without opening a window', async (_label, data) => {
    const sendResponse = jest.fn();
    await signArbitrary(makeCore(SIGNER), makeRequest(data), sendResponse);

    expect(mockCreatePopup).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledTimes(1);
    expect(sendResponse.mock.calls[0][0]).toMatchObject({
      type: 'INVALID_FORMAT',
      key: 'request-key',
    });
  });
});
