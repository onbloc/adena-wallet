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
 * Cursors for one network. Address-scoped walks are keyed by account address,
 * so switching account or network selects a different cursor and one account
 * never resumes from another's height. `catalog` is the chain-wide `NewToken`
 * walk and is therefore network-scoped only.
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

export interface GRC721SyncCache {
  [networkId: string]: NetworkGRC721Sync;
}

/** A cursor that has never been walked. */
export const emptyCursor = <T>(): GRC721SyncCursor<T> => ({ blockHeight: 0, items: [] });
