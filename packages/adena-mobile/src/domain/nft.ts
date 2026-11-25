export interface NftCollection {
  // On-chain collection id "{pkgPath}.{symbol}.{seq}" when known, else the package path.
  id: string;
  // Every collection id the account holds in this realm; `id` is the first. Absent means [id].
  collectionIds?: string[];
  packagePath: string;
  name: string;
  symbol: string;
  ownedCount: number;
  thumbnailNftId?: string;
  supportsTokenUri: boolean;
  supportsMetadata: boolean;
}

export interface NftItem {
  // Source collection the token belongs to; a grouped realm can hold the same nftId in several.
  collectionId: string;
  packagePath: string;
  nftId: string;
  name: string;
  symbol: string;
}

// Token ids are only unique within a collection, so list keys and selection pair them.
export const nftItemKey = (item: Pick<NftItem, 'collectionId' | 'nftId'>): string => JSON.stringify([item.collectionId, item.nftId]);

export interface NftAttribute {
  traitType: string;
  value: string;
}

export interface NftMetadata {
  name?: string;
  description?: string;
  image?: string;
  externalUrl?: string;
  attributes: NftAttribute[];
}

export interface Page<T> {
  items: T[];
  cursor: string | null;
  hasNext: boolean;
}
