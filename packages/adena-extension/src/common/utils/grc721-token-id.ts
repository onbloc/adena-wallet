/**
 * GRC721 collection-identity helpers.
 *
 * `gno.land/p/nt/grc721/v0` stamps every collection with an unforgeable
 * `Token.ID()` = `` `${packagePath}.${symbol}.${sequence}` `` (e.g.
 * `gno.land/r/gnoswap/gnft.GNFT.0000000`) and carries it in the `token`
 * attribute of every `NewToken` / `Transfer` / `Approval` event.
 *
 * That id is the only collection identity an indexer can rely on: the events
 * are emitted by the shared `/p/` package, so an event's `pkg_path` is always
 * the grc721 package path and never the collection's own realm.
 *
 * The wallet keys storage, RPC and transaction messages by the realm
 * `packagePath`, so these helpers split the collection id back into its parts.
 * The shape matches GRC20's `Token.ID()` (`{packagePath}.{symbol}.{sequence}`),
 * hence the reuse of {@link parseTokenPath}.
 */
import { parseTokenPath } from './grc20-token-path';

export interface ParsedGrc721CollectionId {
  packagePath: string;
  symbol: string;
  sequence: string;
}

/**
 * Split a grc721 `Token.ID()` into its parts. The symbol charset excludes `.`
 * (see `grc721.validSymbol`), so the last dot always separates the sequence.
 * Returns null when the value is not a full collection id.
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

/** Realm path of a grc721 collection id, or null when it does not parse. */
export function packagePathOfGrc721CollectionId(collectionId: string): string | null {
  return parseGrc721CollectionId(collectionId)?.packagePath ?? null;
}
