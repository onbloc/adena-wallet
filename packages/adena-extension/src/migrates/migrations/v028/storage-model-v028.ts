import { StorageModelDataV027 } from '../v027/storage-model-v027';

/**
 * How far the indexer has already been walked for one GRC721 query, plus the
 * candidates that walk produced.
 *
 * The GRC721 flows treat the indexer as an append-only source of *candidates*
 * and let RPC (`BalanceOf` / `OwnerOf`) decide what the account still holds, so
 * a cursor can resume from the stored height and fold only the newer events in.
 */
export type GRC721SyncCursorModelV028<T> = {
  /** Highest block height already folded into `items`. */
  blockHeight: number;
  /** Candidates gathered up to `blockHeight`, in the query's own order. */
  items: T[];
};

/** A collection announced by a grc721 `NewToken` event. */
export type GRC721CollectionCandidateModelV028 = {
  collectionId: string;
  name: string;
  symbol: string;
};

/** A token id an address received, with the collection that emitted it. */
export type GRC721TokenCandidateModelV028 = {
  tokenId: string;
  collectionId: string;
};

/**
 * Indexer cursors, keyed by network first and then by account address, so
 * switching either selects a different set and one account's walk never
 * resumes from another's height. `catalog` is the chain-wide `NewToken` walk
 * and is therefore only network-scoped.
 */
export type AccountGRC721SyncModelV028 = {
  [networkId in string]: {
    catalog?: GRC721SyncCursorModelV028<GRC721CollectionCandidateModelV028>;
    collections?: {
      [address in string]: GRC721SyncCursorModelV028<string>;
    };
    tokens?: {
      [address in string]: {
        [packagePath in string]: GRC721SyncCursorModelV028<GRC721TokenCandidateModelV028>;
      };
    };
  };
};

// v028 adds ACCOUNT_GRC721_SYNC. Without it every NFT read re-walked the whole
// indexer history for the account.
export type StorageModelDataV028 = StorageModelDataV027 & {
  ACCOUNT_GRC721_SYNC: AccountGRC721SyncModelV028;
};

export type StorageModelV028 = {
  version: 28;
  data: StorageModelDataV028;
};
