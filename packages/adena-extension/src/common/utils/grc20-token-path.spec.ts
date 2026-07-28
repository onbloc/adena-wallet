import {
  isTokenPath,
  packagePathOfTokenPath,
  parseRegistryKey,
  parseTokenPath,
  registryKeyToTokenPath,
  toRegistryKey,
  toTokenPath,
} from './grc20-token-path';

const PKG = 'gno.land/r/demo/foo20';
const SYMBOL = 'FOO';
const TOKEN_PATH = 'gno.land/r/demo/foo20:FOO';
const REGISTRY_KEY = 'gno.land/r/demo/foo20.FOO';

describe('grc20-token-path', () => {
  it('toTokenPath joins packagePath and symbol with a colon', () => {
    expect(toTokenPath(PKG, SYMBOL)).toBe(TOKEN_PATH);
  });

  it('parseTokenPath splits on the last colon', () => {
    expect(parseTokenPath(TOKEN_PATH)).toEqual({ packagePath: PKG, symbol: SYMBOL });
  });

  it('parseTokenPath returns null for a bare packagePath', () => {
    expect(parseTokenPath(PKG)).toBeNull();
  });

  it('parseTokenPath returns null when the symbol is empty', () => {
    expect(parseTokenPath(`${PKG}:`)).toBeNull();
  });

  it('isTokenPath distinguishes token paths from bare packagePaths', () => {
    expect(isTokenPath(TOKEN_PATH)).toBe(true);
    expect(isTokenPath(PKG)).toBe(false);
  });

  it('packagePathOfTokenPath extracts the packagePath and falls back to the input', () => {
    expect(packagePathOfTokenPath(TOKEN_PATH)).toBe(PKG);
    expect(packagePathOfTokenPath(PKG)).toBe(PKG);
  });

  it('toRegistryKey converts a token path to the dot-notation fqname key', () => {
    expect(toRegistryKey(TOKEN_PATH)).toBe(REGISTRY_KEY);
    expect(toRegistryKey(PKG)).toBeNull();
  });

  it('parseRegistryKey splits on the first dot after the last slash (ignores gno.land dots)', () => {
    expect(parseRegistryKey(REGISTRY_KEY)).toEqual({ packagePath: PKG, symbol: SYMBOL });
  });

  it('parseRegistryKey returns null when there is no symbol', () => {
    expect(parseRegistryKey(PKG)).toBeNull();
  });

  it('registryKeyToTokenPath round-trips with toRegistryKey', () => {
    expect(registryKeyToTokenPath(REGISTRY_KEY)).toBe(TOKEN_PATH);
    expect(toRegistryKey(registryKeyToTokenPath(REGISTRY_KEY) as string)).toBe(REGISTRY_KEY);
  });

  it('handles symbols with digits and case', () => {
    const tp = toTokenPath('gno.land/r/gnoswap/v1/gns', 'GNS');
    expect(toRegistryKey(tp)).toBe('gno.land/r/gnoswap/v1/gns.GNS');
    expect(registryKeyToTokenPath('gno.land/r/gnoswap/v1/gns.GNS')).toBe(tp);
  });
});
