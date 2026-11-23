import { ChainFamily } from '../../../domain/network';
import { HttpClient } from '../../../infrastructure/http/http-client';
import { OnblocApiClient } from '../../../infrastructure/http/onbloc-api.client';
import { ChainModule } from '../chain-registry';
import { GnoAssetRepository } from './gno-asset.repository';
import { GnoChainRepository } from './gno-chain.repository';
import { GnoGrc20Registry } from './gno-grc20-registry';
import { GnoNftRepository } from './gno-nft.repository';
import { GnoProviderFactory } from './gno-provider';
import { GnoTokenResourceRepository } from './gno-token-resource.repository';
import { GnoHistoryRepository } from './history/gno-history.repository';

export interface GnoModuleDeps {
  providerFactory: GnoProviderFactory;
  http: HttpClient;
}

export const createGnoModule = ({ providerFactory, http }: GnoModuleDeps): ChainModule => {
  const api = new OnblocApiClient(http);

  return {
    family: ChainFamily.GNO,
    chain: new GnoChainRepository(providerFactory),
    assets: new GnoAssetRepository(providerFactory, new GnoTokenResourceRepository(http), new GnoGrc20Registry(providerFactory), api),
    nfts: new GnoNftRepository(providerFactory, api),
    history: new GnoHistoryRepository(api),
  };
};
