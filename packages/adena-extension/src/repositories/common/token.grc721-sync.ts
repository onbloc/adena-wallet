/**
 * Where the GRC721 catalog walk over the indexer left off, so the next one
 * resumes instead of replaying the chain's whole history.
 *
 * This is a derived cache, not wallet state. Losing it costs one full walk, so
 * it lives outside the migrated wallet blob — see `ChromeCacheStorage`.
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
  /**
   * When the range below `blockHeight` was last read in full.
   *
   * Resuming assumes the indexer only ever appends, and it does not: a
   * re-index can repair a transaction at an older height while the tip keeps
   * advancing, so a receipt can appear *below* the cursor. Recording when the
   * whole range was last read lets a walk redo it on a timer and pick those up.
   * Absent on cursors written before this was stored, which reconcile once.
   */
  reconciledAt?: number;
  /** Candidates gathered up to `blockHeight`, in the query's own order. */
  items: T[];
}

/** A collection announced by a grc721 `NewToken` event. */
export interface GRC721CollectionCandidate {
  collectionId: string;
  name: string;
  symbol: string;
}

/** Cursors for one chain. `catalog` is the chain-wide `NewToken` walk. */
export interface NetworkGRC721Sync {
  catalog?: GRC721SyncCursor<GRC721CollectionCandidate>;
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

/**
 * How long a cursor may keep resuming before the next walk re-reads its whole
 * range from genesis. Bounds how long a receipt backfilled below the cursor can
 * stay invisible, and costs one extra query per cursor per interval.
 */
export const GRC721_RECONCILE_INTERVAL_MS = 10 * 60 * 1000;

/** A cursor that has never been walked. */
export const emptyCursor = <T>(): GRC721SyncCursor<T> => ({ blockHeight: 0, items: [] });
