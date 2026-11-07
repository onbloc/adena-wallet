import {
  MAX_MESSAGE_BYTES,
  parsePageMessage,
} from '../../src/browser/page-message';

const token = 'secret-token';
const request = {
  key: 'k1',
  type: 'GET_ACCOUNT',
  status: 'request',
  hostname: 'spoofed.example',
  protocol: 'https:',
};
const envelope = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    channel: 'adena',
    token,
    origin: 'https://gno.land',
    message: request,
    ...overrides,
  });

const parse = (raw: string, nativeOrigin: string | null = 'https://gno.land') =>
  parsePageMessage({raw, nativeOrigin, nativeUrl: `${nativeOrigin}/`, token});

describe('parsePageMessage', () => {
  it('accepts a request and replaces the page-reported origin with the native one', () => {
    const result = parse(envelope());
    expect(result).toEqual({
      accepted: true,
      message: {...request, protocol: 'https:', hostname: 'gno.land'},
    });
  });

  it('drops messages without the bridge token (e.g. from an iframe)', () => {
    expect(parse(envelope({token: 'guess'}))).toEqual({
      accepted: false,
      reason: 'bad-token',
    });
  });

  it('drops messages whose claimed origin differs from the navigation origin', () => {
    expect(parse(envelope({origin: 'https://evil.example'}))).toMatchObject({
      reason: 'origin-mismatch',
    });
  });

  it('drops messages from pages that are not https', () => {
    expect(
      parse(envelope({origin: 'http://gno.land'}), 'http://gno.land'),
    ).toMatchObject({
      reason: 'origin-not-allowed',
    });
    expect(parse(envelope(), null)).toMatchObject({
      reason: 'origin-not-allowed',
    });
  });

  it('drops oversized, malformed and non-request messages', () => {
    expect(parse('x'.repeat(MAX_MESSAGE_BYTES + 1))).toMatchObject({
      reason: 'too-large',
    });
    expect(parse('{not json')).toMatchObject({reason: 'not-json'});
    expect(
      parse(envelope({message: {...request, status: 'success'}})),
    ).toMatchObject({reason: 'not-a-request'});
  });
});
