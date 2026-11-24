export interface NftCollection {
  // On-chain collection id "{pkgPath}.{symbol}.{seq}" when known, else the package path.
  id: string;
  packagePath: string;
  name: string;
  symbol: string;
  ownedCount: number;
  thumbnailNftId?: string;
  supportsTokenUri: boolean;
  supportsMetadata: boolean;
}

export interface NftItem {
  collectionId: string;
  packagePath: string;
  nftId: string;
  name: string;
  symbol: string;
}

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
