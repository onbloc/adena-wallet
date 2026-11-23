import { tokenPriceKey, TokenSource, TokenType } from '../../../src/domain/token';

describe('tokenPriceKey', () => {
  it('joins token and network ids', () => {
    expect(tokenPriceKey('ugnot', 'gnoland1')).toBe('ugnot:gnoland1');
    expect(tokenPriceKey('', '')).toBe(':');
    expect(tokenPriceKey('gno.land/r/foo.FOO', 'test:13')).toBe('gno.land/r/foo.FOO:test:13');
  });
});

describe('enums', () => {
  it('exposes token types and sources', () => {
    expect(Object.values(TokenType)).toEqual(['native', 'grc20']);
    expect(Object.values(TokenSource)).toEqual(['default', 'discovered', 'custom']);
  });
});
