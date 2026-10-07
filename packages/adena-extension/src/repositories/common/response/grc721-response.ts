/** A collection from `/v1/accounts/{address}/grc721-tokens`. */
export interface AccountGRC721Collection {
  /** grc721 `Token.ID()` of the collection, e.g. `{packagePath}.{symbol}.{sequence}`. */
  tokenId: string;
  packagePath: string;
  name: string;
  symbol: string;
  /** Tokens the account owns or operates. */
  tokenCount: number;
  /** Tokens the account owns. */
  ownedCount: number;
}

export interface AccountGRC721CollectionsResponse {
  items: AccountGRC721Collection[];
}

/** A token from `/v1/accounts/{address}/grc721-tokens/{tokenId}/items`. */
export interface AccountGRC721CollectionItem {
  /** The collection id, not the NFT's own id; see `nftId`. */
  tokenId: string;
  packagePath: string;
  nftId: string;
  name: string;
  symbol: string;
  ownerAddress: string;
  operatorAddress: string;
  /** False when the account only operates the token, e.g. a staked GNFT. */
  isOwned: boolean;
}

export interface AccountGRC721CollectionItemsResponse {
  items: AccountGRC721CollectionItem[];
  page?: {
    cursor?: string | null;
    hasNext: boolean;
  };
}
