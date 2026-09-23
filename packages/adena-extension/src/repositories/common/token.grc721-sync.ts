/**
 * Where each GRC721 indexer walk left off, so the next one resumes instead of
 * replaying the account's whole history.
 *
 * This is a derived cache, not wallet state: the indexer only ever supplies
 * *candidates* and RPC (`BalanceOf` / `OwnerOf`) decides on every read what the
 * account still holds. Losing it costs one full walk, so it lives outside the
 * migrated wallet blob — see `ChromeCacheStorage`.
 */

import { CacheValueType, GRC721_SYNC_CACHE_KEY } from '@common/storage';

/** Cache key; plain `chrome.storage.local`, not part of `ADENA_DATA`. */
export { GRC721_SYNC_CACHE_KEY };

export type GRC721SyncCacheValueType = CacheValueType;

export interface GRC721SyncCursor<T> {
  /** Highest block height already folded into `items`. */
  blockHeight: number;
  /**
   * The indexer's own tip when this cursor was last written.
   *
   * A rewind is a *drop in the tip*, which is why the tip has to be recorded
   * rather than inferred: `blockHeight` is the newest block that matched this
   * query, which for a typical account sits far below the tip, so comparing a
   * fresh tip against it only spots a reset chain during the brief window
   * before the new chain grows past that height. Absent on cursors written
   * before this was stored.
   */
  latestBlockHeight?: number;
  /** Candidates gathered up to `blockHeight`, in the query's own order. */
  items: T[];
}

/** A collection announced by a grc721 `NewToken` event. */
export interface GRC721CollectionCandidate {
  collectionId: string;
  name: string;
  symbol: string;
}

/** A token id an address received, with the collection that emitted it. */
export interface GRC721TokenCandidate {
  tokenId: string;
  collectionId: string;
}

/**
 * Cursors for one chain. Address-scoped walks are keyed by account address, so
 * switching account or chain selects a different cursor and one account never
 * resumes from another's height. `catalog` is the chain-wide `NewToken` walk
 * and is therefore chain-scoped only.
 */
export interface NetworkGRC721Sync {
  catalog?: GRC721SyncCursor<GRC721CollectionCandidate>;
  collections?: {
    [address in string]: GRC721SyncCursor<string>;
  };
  tokens?: {
    [address in string]: {
      [packagePath in string]: GRC721SyncCursor<GRC721TokenCandidate>;
    };
  };
}

/**
 * Keyed by chain id, not by the wallet's own network record id: that id is
 * local bookkeeping and stays the same when the user re-points a network at a
 * different RPC or indexer, which would otherwise resume a walk at a height
 * belonging to another chain.
 */
export interface GRC721SyncCache {
  [chainId: string]: NetworkGRC721Sync;
}

/** A cursor that has never been walked. */
export const emptyCursor = <T>(): GRC721SyncCursor<T> => ({ blockHeight: 0, items: [] });
