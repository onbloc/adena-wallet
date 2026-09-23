/**
 * GRC721 collection identity. grc721 stamps every collection with a
 * `Token.ID()` = `` `${packagePath}.${symbol}.${sequence}` `` (e.g.
 * `gno.land/r/gnoswap/gnft.GNFT.0000000`) and carries it in the `token`
 * attribute of its events. The wallet keys storage, RPC and transaction
 * messages by the realm `packagePath`, so these split the id back into parts.
 * The shape matches GRC20's, hence the reuse of {@link parseTokenPath}.
 */
import { parseTokenPath } from './grc20-token-path';

export interface ParsedGrc721CollectionId {
  packagePath: string;
  symbol: string;
  sequence: string;
}

/**
 * The symbol charset excludes `.` (see `grc721.validSymbol`), so the last dot
 * always separates the sequence. Null when the value is not a full id.
 */
export function parseGrc721CollectionId(collectionId: string): ParsedGrc721CollectionId | null {
  const sequenceIdx = collectionId.lastIndexOf('.');
  if (sequenceIdx <= 0 || sequenceIdx === collectionId.length - 1) {
    return null;
  }

  const parsed = parseTokenPath(collectionId.slice(0, sequenceIdx));
  if (!parsed || !parsed.symbol) {
    return null;
  }

  return {
    packagePath: parsed.packagePath,
    symbol: parsed.symbol,
    sequence: collectionId.slice(sequenceIdx + 1),
  };
}

/** Realm path of a collection id, or null when it does not parse. */
export function packagePathOfGrc721CollectionId(collectionId: string): string | null {
  return parseGrc721CollectionId(collectionId)?.packagePath ?? null;
}
