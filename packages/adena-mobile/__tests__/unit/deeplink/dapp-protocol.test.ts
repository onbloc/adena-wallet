import { AppErrorCode, isAppError } from '../../../src/core/errors';
import { decodeBase64Url, encodeBase64Url } from '../../../src/deeplink/base64url';
import {
  buildCallbackUrl,
  buildDappRequestUrl,
  DappRequestPayload,
  getCallbackOrigin,
  isDappRequestUrl,
  parseDappRequestUrl,
  PROTOCOL_VERSION,
  REQUEST_HOST,
} from '../../../src/deeplink/dapp-protocol';
import { DappMethod, DappResponseStatus } from '../../../src/domain/dapp';

const NOW = 1_700_000_000_000;

const connect = (overrides: Partial<DappRequestPayload> = {}): DappRequestPayload => ({
  version: PROTOCOL_VERSION,
  id: 'req-1',
  method: DappMethod.CONNECT,
  callback: 'https://App.Example.com/cb?x=1',
  dapp: { name: 'Example' },
  ...overrides,
});

const sign = (overrides: Partial<DappRequestPayload> = {}): DappRequestPayload => connect({
  method: DappMethod.SIGN_AND_BROADCAST,
  chainId: 'gnoland1',
  params: { messages: [{ type: '/bank.MsgSend' }] },
  ...overrides,
});

const rawUrl = (value: unknown): string => `adena://request?payload=${encodeURIComponent(encodeBase64Url(JSON.stringify(value)))}`;

const expectInvalid = (fn: () => unknown, message?: string | RegExp, code: AppErrorCode = AppErrorCode.INVALID_REQUEST): void => {
  let thrown: unknown;

  try {
    fn();
  }
  catch (error) {
    thrown = error;
  }

  expect(isAppError(thrown, code)).toBe(true);

  if (message) {
    expect((thrown as Error).message).toMatch(message);
  }
};

describe('constants', () => {
  it('exposes protocol constants', () => {
    expect(PROTOCOL_VERSION).toBe(1);
    expect(REQUEST_HOST).toBe('request');
  });
});

describe('getCallbackOrigin', () => {
  it('normalizes https origins', () => {
    expect(getCallbackOrigin('HTTPS://App.Example.COM:8443/path?q#h')).toBe('https://app.example.com:8443');
    expect(getCallbackOrigin('https://example.com')).toBe('https://example.com');
    expect(getCallbackOrigin('https://example.com#frag')).toBe('https://example.com');
  });

  it('returns the scheme for app callbacks', () => {
    expect(getCallbackOrigin('MyApp://callback')).toBe('myapp:');
    expect(getCallbackOrigin('com.example.app:/cb')).toBe('com.example.app:');
  });

  it.each([
    'http://example.com',
    'javascript:alert(1)',
    'data:text/html,x',
    'file:///etc',
    'about:blank',
    'blob:https://x',
    'intent://x#Intent;end',
    'content://x',
    'android-app://x',
    'adena://request',
    'ADENA://request',
    'no-scheme',
    '',
    '1abc://x',
  ])('blocks %p', (url) => {
    expectInvalid(() => getCallbackOrigin(url), 'callback must use https or an app scheme');
  });

  it.each([
    'https://',
    'https://user@example.com',
    'https:example.com',
    'https:// example.com',
    'https://evil.example\\.gnoswap.io/cb',
    'https://evil.example%2f.gnoswap.io',
    'https://gnoswap.io\tevil.example',
    'https://gnosw\u0430p.io/cb',
    'https://gnoswap..io',
    'https://gnoswap.io:/cb',
  ])('rejects malformed https url %p', (url) => {
    expectInvalid(() => getCallbackOrigin(url), 'callback is not a valid https URL');
  });
});

describe('isDappRequestUrl', () => {
  it('matches the request host case-insensitively', () => {
    expect(isDappRequestUrl('adena://request?payload=x')).toBe(true);
    expect(isDappRequestUrl('ADENA://REQUEST')).toBe(true);
    expect(isDappRequestUrl('adena://other')).toBe(false);
    expect(isDappRequestUrl('https://request')).toBe(false);
    expect(isDappRequestUrl('')).toBe(false);
  });
});

describe('parseDappRequestUrl', () => {
  it('parses a connect request', () => {
    const request = parseDappRequestUrl(buildDappRequestUrl(connect({ dapp: { name: 'Ex', url: 'https://ex', icon: 'https://ex/i.png' }, chainId: 'c1', expiresAt: NOW })), NOW);

    expect(request).toEqual({
      requestId: 'req-1',
      method: DappMethod.CONNECT,
      callbackUrl: 'https://App.Example.com/cb?x=1',
      callbackOrigin: 'https://app.example.com',
      dapp: { name: 'Ex', url: 'https://ex', icon: 'https://ex/i.png' },
      chainId: 'c1',
      expiresAt: NOW,
      receivedAt: NOW,
    });
  });

  it('defaults receivedAt to the current time', () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(42);
    expect(parseDappRequestUrl(buildDappRequestUrl(connect())).receivedAt).toBe(42);
  });

  it('parses transaction requests with optional params', () => {
    const request = parseDappRequestUrl(buildDappRequestUrl(sign({ params: { messages: [], memo: 'hi', gasWanted: '100', gasFee: '1ugnot' } })), NOW);

    expect(request).toMatchObject({ method: DappMethod.SIGN_AND_BROADCAST, chainId: 'gnoland1', messages: [], memo: 'hi', gasWanted: '100', gasFee: '1ugnot' });
  });

  it('defaults the memo and leaves gas fields undefined', () => {
    const request = parseDappRequestUrl(buildDappRequestUrl(sign({ method: DappMethod.SIGN_TRANSACTION, params: { messages: [1], memo: null as unknown as string } })), NOW);

    expect(request).toMatchObject({ method: DappMethod.SIGN_TRANSACTION, memo: '', messages: [1] });
    expect(request).toHaveProperty('gasWanted', undefined);
    expect(request).toHaveProperty('gasFee', undefined);
  });

  it('ignores a non-numeric expiresAt', () => {
    expect(parseDappRequestUrl(buildDappRequestUrl(connect({ expiresAt: '1' as unknown as number })), NOW).expiresAt).toBeUndefined();
  });

  it('rejects expired requests', () => {
    expectInvalid(() => parseDappRequestUrl(buildDappRequestUrl(connect({ expiresAt: NOW - 1 })), NOW), 'This request has expired', AppErrorCode.REQUEST_EXPIRED);
  });

  it('finds the payload among other params and ignores the fragment', () => {
    const encoded = encodeURIComponent(encodeBase64Url(JSON.stringify(connect())));

    expect(parseDappRequestUrl(`adena://request?foo=bar&payload=${encoded}#ignored`, NOW).requestId).toBe('req-1');
  });

  it('rejects links that are not adena requests', () => {
    expectInvalid(() => parseDappRequestUrl('https://example.com?payload=x'), 'Not an Adena request link');
  });

  it.each(['adena://request', 'adena://request?', 'adena://request?foo=bar', 'adena://request#payload=x'])('rejects a missing payload in %p', (url) => {
    expectInvalid(() => parseDappRequestUrl(url), 'payload is missing');
  });

  it('rejects oversized payloads', () => {
    expectInvalid(() => parseDappRequestUrl(`adena://request?payload=${'a'.repeat(64 * 1024 + 1)}`), 'payload is too large');
  });

  it.each(['@@@', encodeBase64Url('not json'), encodeBase64Url('{"a":')])('rejects undecodable payload %p', (payload) => {
    expectInvalid(() => parseDappRequestUrl(`adena://request?payload=${payload}`), 'payload is not valid base64url JSON');
  });

  it.each([null, 1, 'str', true])('rejects non-object payload %p', (value) => {
    expectInvalid(() => parseDappRequestUrl(rawUrl(value)), 'payload must be an object');
  });

  it.each([0, 2, '1', undefined])('rejects protocol version %p', (version) => {
    expectInvalid(() => parseDappRequestUrl(rawUrl({ ...connect(), version })), /Unsupported protocol version/);
  });

  it.each(['sign', '', undefined, 'CONNECT'])('rejects method %p', (method) => {
    expectInvalid(() => parseDappRequestUrl(rawUrl({ ...connect(), method })), /Unsupported method/);
  });

  it('validates required and optional strings', () => {
    expectInvalid(() => parseDappRequestUrl(rawUrl({ ...connect(), callback: undefined }), NOW), 'callback is required');
    expectInvalid(() => parseDappRequestUrl(rawUrl({ ...connect(), callback: 5 }), NOW), 'callback must be a string up to 2048 characters');
    expectInvalid(() => parseDappRequestUrl(rawUrl({ ...connect(), callback: `https://x/${'a'.repeat(2048)}` }), NOW), /callback must be a string/);
    expectInvalid(() => parseDappRequestUrl(rawUrl({ ...connect(), id: '' }), NOW), 'id is required');
    expectInvalid(() => parseDappRequestUrl(rawUrl({ ...connect(), id: 'x'.repeat(129) }), NOW), 'id must be a string up to 128 characters');
    expectInvalid(() => parseDappRequestUrl(rawUrl({ ...connect(), dapp: undefined }), NOW), 'dapp.name is required');
    expectInvalid(() => parseDappRequestUrl(rawUrl({ ...connect(), dapp: { name: 'x'.repeat(65) } }), NOW), /dapp.name must be/);
    expectInvalid(() => parseDappRequestUrl(rawUrl({ ...connect(), dapp: { name: 'x', url: 1 } }), NOW), /dapp.url must be/);
    expectInvalid(() => parseDappRequestUrl(rawUrl({ ...connect(), dapp: { name: 'x', icon: 'i'.repeat(513) } }), NOW), /dapp.icon must be/);
    expectInvalid(() => parseDappRequestUrl(rawUrl({ ...connect(), chainId: 'c'.repeat(65) }), NOW), /chainId must be/);
  });

  it('rejects blocked callbacks', () => {
    expectInvalid(() => parseDappRequestUrl(buildDappRequestUrl(connect({ callback: 'javascript:alert(1)' })), NOW), 'callback must use https or an app scheme');
  });

  it('validates transaction params', () => {
    expectInvalid(() => parseDappRequestUrl(buildDappRequestUrl(sign({ params: undefined })), NOW), 'params are required');
    expectInvalid(() => parseDappRequestUrl(buildDappRequestUrl(sign({ chainId: undefined })), NOW), 'chainId is required');
    expectInvalid(() => parseDappRequestUrl(rawUrl({ ...sign(), params: { messages: {} } }), NOW), 'params.messages must be an array');
    expectInvalid(() => parseDappRequestUrl(rawUrl({ ...sign(), params: { messages: [], memo: 'm'.repeat(1025) } }), NOW), /params.memo must be/);
    expectInvalid(() => parseDappRequestUrl(rawUrl({ ...sign(), params: { messages: [], gasWanted: 100 } }), NOW), /params.gasWanted must be/);
    expectInvalid(() => parseDappRequestUrl(rawUrl({ ...sign(), params: { messages: [], gasFee: 'f'.repeat(65) } }), NOW), /params.gasFee must be/);
  });

  it('keeps unicode metadata', () => {
    expect(parseDappRequestUrl(buildDappRequestUrl(connect({ dapp: { name: '아데나 🙂' } })), NOW).dapp.name).toBe('아데나 🙂');
  });

  it.todo('malformed percent-encoding in the query should throw INVALID_REQUEST (currently a raw URIError from decodeURIComponent)');
});

describe('buildCallbackUrl', () => {
  const response = { requestId: 'r', status: DappResponseStatus.SUCCESS, data: { address: 'g1' } };

  const decodeResponse = (url: string): unknown =>
    JSON.parse(decodeBase64Url(decodeURIComponent(/response=([^#&]+)/.exec(url)?.[1] ?? '')));

  it('appends the response with ? or &', () => {
    expect(buildCallbackUrl('https://x/cb', response)).toMatch(/^https:\/\/x\/cb\?response=[\w-]+$/);
    expect(buildCallbackUrl('https://x/cb?a=1', response)).toMatch(/^https:\/\/x\/cb\?a=1&response=/);
    expect(decodeResponse(buildCallbackUrl('https://x/cb', response))).toEqual(response);
  });

  it('keeps the fragment after the query', () => {
    const url = buildCallbackUrl('myapp://cb#state', response);

    expect(url).toMatch(/^myapp:\/\/cb\?response=[\w-]+#state$/);
    expect(buildCallbackUrl('myapp://cb#', response)).toMatch(/#$/);
  });
});

describe('buildDappRequestUrl', () => {
  it('builds a link that parses back to the payload', () => {
    const url = buildDappRequestUrl(connect());

    expect(url.startsWith('adena://request?payload=')).toBe(true);
    expect(parseDappRequestUrl(url, NOW).requestId).toBe('req-1');
  });
});
