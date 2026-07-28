/**
 * GRC20 token-path helpers.
 *
 * The wallet identifies a GRC20 token by its **token path**
 * `` `${packagePath}:${symbol}` `` (colon separator). On-chain, the `grc20reg`
 * registry keys the same token by the canonical fqname
 * `` `${packagePath}.${symbol}` `` (dot separator, see
 * `fqname.Construct(rlmPath, symbol)`), one token per realm+symbol.
 *
 * A gno package path uses slashes and never contains a `:`; only the trailing
 * `.symbol` segment carries a dot after the last slash. That makes the
 * conversion between the two representations deterministic.
 */

const TOKEN_PATH_SEPARATOR = ':';
const REGISTRY_KEY_SEPARATOR = '.';

export interface ParsedTokenPath {
  packagePath: string;
  symbol: string;
}

/** Build the wallet token path `packagePath:symbol`. */
export function toTokenPath(packagePath: string, symbol: string): string {
  return `${packagePath}${TOKEN_PATH_SEPARATOR}${symbol}`;
}

/**
 * Split a wallet token path into its packagePath and symbol. Returns null when
 * the value is a bare packagePath (no `:`) or otherwise malformed.
 */
export function parseTokenPath(tokenPath: string): ParsedTokenPath | null {
  const idx = tokenPath.lastIndexOf(TOKEN_PATH_SEPARATOR);
  if (idx <= 0 || idx === tokenPath.length - 1) {
    return null;
  }
  return {
    packagePath: tokenPath.slice(0, idx),
    symbol: tokenPath.slice(idx + 1),
  };
}

/** True when the value carries a `:symbol` suffix (token path, not a bare pkgPath). */
export function isTokenPath(value: string): boolean {
  return parseTokenPath(value) !== null;
}

/** packagePath component of a token path (falls back to the input when it has no symbol). */
export function packagePathOfTokenPath(tokenPath: string): string {
  return parseTokenPath(tokenPath)?.packagePath ?? tokenPath;
}

/**
 * Convert a wallet token path `packagePath:symbol` into the on-chain grc20reg
 * registry key `packagePath.symbol`. Returns null for a bare packagePath.
 */
export function toRegistryKey(tokenPath: string): string | null {
  const parsed = parseTokenPath(tokenPath);
  if (!parsed) {
    return null;
  }
  return `${parsed.packagePath}${REGISTRY_KEY_SEPARATOR}${parsed.symbol}`;
}

/**
 * Parse an on-chain grc20reg registry key `packagePath.symbol` (fqname form)
 * into its parts. Mirrors `fqname.Parse`: the split point is the first dot
 * **after the last slash**, so the dots inside the domain (e.g. `gno.land`) are
 * never mistaken for the symbol separator. Returns null when there is no symbol.
 */
export function parseRegistryKey(key: string): ParsedTokenPath | null {
  const lastSlash = key.lastIndexOf('/');
  const searchFrom = lastSlash === -1 ? 0 : lastSlash + 1;
  const dotIdx = key.indexOf(REGISTRY_KEY_SEPARATOR, searchFrom);
  if (dotIdx === -1 || dotIdx === key.length - 1) {
    return null;
  }
  return {
    packagePath: key.slice(0, dotIdx),
    symbol: key.slice(dotIdx + 1),
  };
}

/** Convert an on-chain registry key `packagePath.symbol` into a wallet token path. */
export function registryKeyToTokenPath(key: string): string | null {
  const parsed = parseRegistryKey(key);
  if (!parsed) {
    return null;
  }
  return toTokenPath(parsed.packagePath, parsed.symbol);
}
