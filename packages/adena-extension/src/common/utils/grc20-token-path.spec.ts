import {
  isTokenPath,
  packagePathOfTokenPath,
  parseRegistryKey,
  parseTokenIdentifier,
  parseTokenPath,
  registryKeyToTokenPath,
  toRegistryKey,
  toTokenPath,
  tokenIdentifierToRegistryKey,
} from './grc20-token-path';

const PKG = 'gno.land/r/demo/foo20';
const SYMBOL = 'FOO';
// The canonical token key is the dot fqname `{packagePath}.{symbol}`.
const TOKEN_KEY = 'gno.land/r/demo/foo20.FOO';
// Legacy colon form, still accepted on input (e.g. hand-typed paths).
const LEGACY_COLON = 'gno.land/r/demo/foo20:FOO';

describe('grc20-token-path', () => {
  it('toTokenPath joins packagePath and symbol with a dot', () => {
    expect(toTokenPath(PKG, SYMBOL)).toBe(TOKEN_KEY);
  });

  it('parseTokenPath splits on the first dot after the last slash (ignores gno.land dots)', () => {
    expect(parseTokenPath(TOKEN_KEY)).toEqual({ packagePath: PKG, symbol: SYMBOL });
  });

  it('parseTokenPath returns null for a bare packagePath', () => {
    expect(parseTokenPath(PKG)).toBeNull();
  });

  it('parseTokenPath returns null when the symbol is empty', () => {
    expect(parseTokenPath(`${PKG}.`)).toBeNull();
  });

  it('isTokenPath distinguishes token keys from bare packagePaths', () => {
    expect(isTokenPath(TOKEN_KEY)).toBe(true);
    expect(isTokenPath(PKG)).toBe(false);
  });

  it('packagePathOfTokenPath extracts the packagePath and falls back to the input', () => {
    expect(packagePathOfTokenPath(TOKEN_KEY)).toBe(PKG);
    expect(packagePathOfTokenPath(PKG)).toBe(PKG);
  });

  it('toRegistryKey passes a token key through and rejects a bare packagePath', () => {
    expect(toRegistryKey(TOKEN_KEY)).toBe(TOKEN_KEY);
    expect(toRegistryKey(PKG)).toBeNull();
  });

  it('parseRegistryKey splits on the first dot after the last slash (ignores gno.land dots)', () => {
    expect(parseRegistryKey(TOKEN_KEY)).toEqual({ packagePath: PKG, symbol: SYMBOL });
  });

  it('parseRegistryKey returns null when there is no symbol', () => {
    expect(parseRegistryKey(PKG)).toBeNull();
  });

  it('registryKeyToTokenPath passes the token key through', () => {
    expect(registryKeyToTokenPath(TOKEN_KEY)).toBe(TOKEN_KEY);
    expect(registryKeyToTokenPath(PKG)).toBeNull();
  });

  it('parseTokenIdentifier accepts both the dot key and the legacy colon form', () => {
    expect(parseTokenIdentifier(TOKEN_KEY)).toEqual({ packagePath: PKG, symbol: SYMBOL });
    expect(parseTokenIdentifier(LEGACY_COLON)).toEqual({ packagePath: PKG, symbol: SYMBOL });
  });

  it('parseTokenIdentifier rejects a bare packagePath (no symbol)', () => {
    expect(parseTokenIdentifier(PKG)).toBeNull();
  });

  it('tokenIdentifierToRegistryKey normalizes dot and legacy colon inputs to the token key', () => {
    expect(tokenIdentifierToRegistryKey(TOKEN_KEY)).toBe(TOKEN_KEY);
    expect(tokenIdentifierToRegistryKey(LEGACY_COLON)).toBe(TOKEN_KEY);
    expect(tokenIdentifierToRegistryKey(PKG)).toBeNull();
  });

  it('tokenIdentifierToRegistryKey handles nested realm paths (ucs03_zkgm.SepoliaETH)', () => {
    const pkg = 'gno.land/r/onbloc/ibc/union/apps/ucs03_zkgm';
    expect(tokenIdentifierToRegistryKey(`${pkg}.SepoliaETH`)).toBe(`${pkg}.SepoliaETH`);
    expect(tokenIdentifierToRegistryKey(`${pkg}:SepoliaETH`)).toBe(`${pkg}.SepoliaETH`);
    expect(tokenIdentifierToRegistryKey(pkg)).toBeNull();
  });

  it('handles symbols with digits and case', () => {
    const tp = toTokenPath('gno.land/r/gnoswap/v1/gns', 'GNS');
    expect(tp).toBe('gno.land/r/gnoswap/v1/gns.GNS');
    expect(toRegistryKey(tp)).toBe('gno.land/r/gnoswap/v1/gns.GNS');
    expect(registryKeyToTokenPath('gno.land/r/gnoswap/v1/gns.GNS')).toBe(tp);
  });
});
