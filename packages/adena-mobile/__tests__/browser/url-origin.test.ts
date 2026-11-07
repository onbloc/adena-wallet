import {
  displayHost,
  isAllowedOrigin,
  originOf,
  splitOrigin,
} from '../../src/browser/url-origin';

describe('originOf', () => {
  it('extracts and normalizes the origin', () => {
    expect(originOf('https://Gno.Land/r/demo?x=1#y')).toBe('https://gno.land');
    expect(originOf('https://gno.land:443/path')).toBe('https://gno.land');
    expect(originOf('https://gno.land:8443')).toBe('https://gno.land:8443');
  });

  it('rejects URLs with credentials, which disguise the real host', () => {
    expect(originOf('https://gno.land@evil.example/')).toBeNull();
  });

  it('rejects non-http schemes', () => {
    // eslint-disable-next-line no-script-url
    expect(originOf('javascript:alert(1)')).toBeNull();
    expect(originOf('file:///etc/passwd')).toBeNull();
    expect(originOf('adena://sign')).toBeNull();
  });
});

describe('isAllowedOrigin', () => {
  it('allows https only, plus localhost in development', () => {
    expect(isAllowedOrigin('https://gno.land')).toBe(true);
    expect(isAllowedOrigin('http://gno.land')).toBe(false);
    expect(isAllowedOrigin(null)).toBe(false);
    expect(isAllowedOrigin('http://localhost:8888')).toBe(__DEV__);
  });
});

describe('displayHost', () => {
  it('flags punycode (look-alike Unicode) domains', () => {
    expect(displayHost('https://xn--gnland-6ya.com')).toContain(
      'international domain',
    );
    expect(displayHost('https://gno.land')).toBe('gno.land');
  });
});

describe('splitOrigin', () => {
  it('returns the protocol and hostname fields the extension expects', () => {
    expect(splitOrigin('https://gno.land')).toEqual({
      protocol: 'https:',
      hostname: 'gno.land',
    });
  });
});
