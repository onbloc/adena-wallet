// Stub out `@adena-wallet/sdk` to avoid pulling in @web3auth's native crypto at
// import time. jsdom's globals fail noble-hashes' Uint8Array instance check.
jest.mock('@adena-wallet/sdk', () => ({
  WalletResponseExecuteType: {},
  WalletResponseFailureType: { INVALID_FORMAT: 'INVALID_FORMAT' },
  WalletResponseStatus: { SUCCESS: 'success', FAILURE: 'failure' },
  WalletMessageInfo: {
    INVALID_FORMAT: {
      code: 1002,
      status: 'failure',
      type: 'INVALID_FORMAT',
      message: 'The transaction is in an invalid format.',
    },
  },
}));

import { MAX_ARBITRARY_MESSAGE_BYTES } from '@inject/types';

import { AdenaExecutor } from './executor';

const SIGNER = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

interface CapturedMessage {
  type: string;
  status: string;
  data: { [key: string]: unknown };
  key?: string;
}

function setupPostMessageSpy(): {
  getLast: () => CapturedMessage;
  count: () => number;
  restore: () => void;
} {
  const captured: CapturedMessage[] = [];
  const originalPostMessage = window.postMessage.bind(window);
  const spy = jest.spyOn(window, 'postMessage').mockImplementation((message: unknown) => {
    captured.push(message as CapturedMessage);
  });

  return {
    getLast: () => captured[captured.length - 1],
    count: () => captured.length,
    restore: (): void => {
      spy.mockRestore();
      window.postMessage = originalPostMessage;
    },
  };
}

describe('AdenaExecutor - signArbitrary', () => {
  let spy: ReturnType<typeof setupPostMessageSpy>;

  beforeEach(() => {
    spy = setupPostMessageSpy();
  });

  afterEach(() => {
    spy.restore();
  });

  it('posts a SIGN_ARBITRARY request carrying the signer and the message', () => {
    new AdenaExecutor().signArbitrary({ signer: SIGNER, data: 'hello' });

    const posted = spy.getLast();
    expect(posted.type).toBe('SIGN_ARBITRARY');
    expect(posted.status).toBe('request');
    expect(posted.data).toEqual({ signer: SIGNER, data: 'hello' });
  });

  // `createPopup` puts the request in the popup URL, so anything forwarded here
  // is spent against that budget. Only the validated fields may travel onward,
  // or an extra field makes an oversized request truncate instead of failing.
  it('forwards only the validated fields, dropping anything else the caller sent', () => {
    new AdenaExecutor().signArbitrary({
      signer: SIGNER,
      data: 'hello',
      padding: 'x'.repeat(100_000),
      first: 1,
    } as never);

    expect(Object.keys(spy.getLast().data).sort()).toEqual(['data', 'signer']);
  });

  it.each([
    ['an empty message', { signer: SIGNER, data: '' }],
    ['an address that is not bech32', { signer: 'nope', data: 'hello' }],
    [
      'a message over the size cap',
      { signer: SIGNER, data: 'x'.repeat(MAX_ARBITRARY_MESSAGE_BYTES + 1) },
    ],
  ])('rejects %s without posting a request', (_label, params) => {
    new AdenaExecutor().signArbitrary(params as never);

    expect(spy.getLast().type).toBe('INVALID_FORMAT');
    expect(spy.getLast().status).toBe('failure');
  });
});
