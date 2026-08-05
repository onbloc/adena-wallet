/**
 * GRC20 token-key helpers.
 *
 * The wallet identifies a GRC20 token by a single canonical **token key**
 * `` `${packagePath}.${symbol}` `` (dot separator). This is the same value the
 * on-chain `grc20reg` registry uses (the fqname `fqname.Construct(rlmPath,
 * symbol)`) and the same identity the API returns (`tokenId`/`tokenKey`), so the
 * wallet, the registry, and the API all speak one form — no colon/dot
 * conversion. One token per realm+symbol.
 *
 * A gno package path uses slashes and never contains a `.` in its trailing
 * segment; only the appended `.symbol` carries a dot after the last slash. So
 * the split point is the **first dot after the last slash** — the dots inside
 * the domain (e.g. `gno.land`) are never mistaken for the symbol separator.
 *
 * Input parsing additionally tolerates the legacy colon form
 * `` `${packagePath}:${symbol}` `` (e.g. a hand-typed token path) and normalizes
 * it to the canonical dot key. Everything the wallet *mints* is the dot key.
 */

const TOKEN_KEY_SEPARATOR = '.';
const LEGACY_COLON_SEPARATOR = ':';

export interface ParsedTokenPath {
  packagePath: string;
  symbol: string;
}

/** Build the canonical token key `packagePath.symbol`. */
export function toTokenPath(packagePath: string, symbol: string): string {
  return `${packagePath}${TOKEN_KEY_SEPARATOR}${symbol}`;
}

/**
 * Split a token key `packagePath.symbol` into its parts. The split point is the
 * first dot **after the last slash**, so dots inside the domain (`gno.land`) are
 * never treated as the symbol separator. Returns null for a bare packagePath (no
 * symbol) or an otherwise malformed value.
 */
export function parseTokenPath(tokenPath: string): ParsedTokenPath | null {
  const lastSlash = tokenPath.lastIndexOf('/');
  const searchFrom = lastSlash === -1 ? 0 : lastSlash + 1;
  const dotIdx = tokenPath.indexOf(TOKEN_KEY_SEPARATOR, searchFrom);
  if (dotIdx === -1 || dotIdx === tokenPath.length - 1) {
    return null;
  }
  return {
    packagePath: tokenPath.slice(0, dotIdx),
    symbol: tokenPath.slice(dotIdx + 1),
  };
}

/** True when the value carries a `.symbol` suffix (token key, not a bare pkgPath). */
export function isTokenPath(value: string): boolean {
  return parseTokenPath(value) !== null;
}

/** packagePath component of a token key (falls back to the input when it has no symbol). */
export function packagePathOfTokenPath(tokenPath: string): string {
  return parseTokenPath(tokenPath)?.packagePath ?? tokenPath;
}

/**
 * Parse a token key `packagePath.symbol` (fqname / grc20reg key) into its parts.
 * The token key and the registry key are now the same value, so this is an alias
 * of {@link parseTokenPath}.
 */
export function parseRegistryKey(key: string): ParsedTokenPath | null {
  return parseTokenPath(key);
}

/**
 * Return the grc20reg registry key for a token key. The token key already *is*
 * the registry key (`packagePath.symbol`), so this validates and passes it
 * through; returns null for a bare packagePath.
 */
export function toRegistryKey(tokenPath: string): string | null {
  return isTokenPath(tokenPath) ? tokenPath : null;
}

/**
 * Normalize a registry key into the canonical token key. They are the same
 * value, so this validates and passes it through; returns null when there is no
 * symbol.
 */
export function registryKeyToTokenPath(key: string): string | null {
  return isTokenPath(key) ? key : null;
}

/**
 * Parse a token identifier that is either the canonical dot key
 * `{packagePath}.{symbol}` or the legacy colon form `{packagePath}:{symbol}`
 * (e.g. a hand-typed value) into its parts. Returns null for a bare packagePath
 * (no symbol), so callers can require the symbol component.
 */
export function parseTokenIdentifier(value: string): ParsedTokenPath | null {
  const dotParsed = parseTokenPath(value);
  if (dotParsed) {
    return dotParsed;
  }
  // Legacy colon form `packagePath:symbol`.
  const idx = value.lastIndexOf(LEGACY_COLON_SEPARATOR);
  if (idx <= 0 || idx === value.length - 1) {
    return null;
  }
  return {
    packagePath: value.slice(0, idx),
    symbol: value.slice(idx + 1),
  };
}

/**
 * Resolve a token identifier (canonical dot key or legacy colon form) to the
 * grc20reg registry key `{packagePath}.{symbol}`. Returns null when the input
 * has no symbol — a bare packagePath is never resolved.
 */
export function tokenIdentifierToRegistryKey(value: string): string | null {
  const parsed = parseTokenIdentifier(value);
  if (!parsed) {
    return null;
  }
  return toTokenPath(parsed.packagePath, parsed.symbol);
}
