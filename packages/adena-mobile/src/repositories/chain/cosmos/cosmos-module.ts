import { ChainFamily } from '../../../domain/network';
import { CosmosLcdClient } from '../../../infrastructure/http/cosmos-lcd.client';
import { HttpClient } from '../../../infrastructure/http/http-client';
import { ChainModule } from '../chain-registry';
import { HistoryRepository } from '../history-repository';
import { NftRepository } from '../nft-repository';
import { CosmosAssetRepository } from './cosmos-asset.repository';
import { CosmosChainRepository } from './cosmos-chain.repository';

// NFTs and history are Gno-only in the extension as well.
const unsupportedNfts: NftRepository = {
  family: ChainFamily.COSMOS,
  getCollections: async () => [],
  getItems: async () => ({ items: [], cursor: null, hasNext: false }),
  getTokenUri: async () => null,
  getMetadata: async () => null,
  buildTransferMessages: () => {
    throw new Error('NFT transfers are not supported on this chain');
  },
};

const unsupportedHistory: HistoryRepository = {
  family: ChainFamily.COSMOS,
  isSupported: () => false,
  getActivities: async () => ({ items: [], cursor: null, hasNext: false }),
};

export const createCosmosModule = ({ http }: { http: HttpClient }): ChainModule => {
  const lcd = new CosmosLcdClient(http);

  return {
    family: ChainFamily.COSMOS,
    chain: new CosmosChainRepository(lcd),
    assets: new CosmosAssetRepository(lcd),
    nfts: unsupportedNfts,
    history: unsupportedHistory,
  };
};
