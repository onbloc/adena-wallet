import { hostOf } from '../../../src/utils/url';

describe('hostOf', () => {
  it('returns the hostname without userinfo, port, path or query', () => {
    expect(hostOf('https://Docs.Gno.land/path?q=1#x')).toBe('docs.gno.land');
    expect(hostOf('https://gno.land:8443')).toBe('gno.land');
    expect(hostOf('https://good.com@evil.com/')).toBe('evil.com');
    expect(hostOf('https://a:b@x.example?y')).toBe('x.example');
  });

  it('returns undefined for non-http URLs', () => {
    expect(hostOf('mailto:a@b.c')).toBeUndefined();
    expect(hostOf('https://')).toBeUndefined();
  });
});
