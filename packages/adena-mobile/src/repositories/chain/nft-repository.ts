import { ChainFamily, Network } from '../../domain/network';
import { NftCollection, NftItem, NftMetadata, Page } from '../../domain/nft';

export interface NftRepository {
  readonly family: ChainFamily;
  getCollections(address: string, network: Network): Promise<NftCollection[]>;
  getItems(address: string, collection: NftCollection, network: Network, cursor?: string | null): Promise<Page<NftItem>>;
  // Image URI (http(s) or data:) or null when the collection exposes none.
  getTokenUri(packagePath: string, nftId: string, network: Network): Promise<string | null>;
  getMetadata(packagePath: string, nftId: string, network: Network): Promise<NftMetadata | null>;
  buildTransferMessages(params: NftTransferParams): unknown[];
}

export interface NftTransferParams {
  network: Network;
  fromAddress: string;
  toAddress: string;
  packagePath: string;
  nftId: string;
}
