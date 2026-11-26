import { ChainFamily, Network } from '../../domain/network';
import { AssetRepository } from './asset-repository';
import { ChainRepository } from './chain-repository';
import { HistoryRepository } from './history-repository';
import { NftRepository } from './nft-repository';
import { SwapRepository } from './swap-repository';

// Everything a chain family contributes. Adding a family = adding one module.
export interface ChainModule {
  family: ChainFamily;
  chain: ChainRepository;
  assets: AssetRepository;
  nfts: NftRepository;
  history: HistoryRepository;
  // Families without a DEX integration leave it out.
  swap?: SwapRepository;
}

export class ChainRegistry {
  private readonly modules = new Map<ChainFamily, ChainModule>();

  constructor(modules: ChainModule[]) {
    modules.forEach(module => this.modules.set(module.family, module));
  }

  module(network: Network): ChainModule {
    const module = this.modules.get(network.family);

    if (!module) {
      throw new Error(`No chain module registered for ${network.family}`);
    }

    return module;
  }

  forNetwork(network: Network): ChainRepository {
    return this.module(network).chain;
  }

  assets(network: Network): AssetRepository {
    return this.module(network).assets;
  }

  nfts(network: Network): NftRepository {
    return this.module(network).nfts;
  }

  history(network: Network): HistoryRepository {
    return this.module(network).history;
  }

  swap(network: Network): SwapRepository | undefined {
    return this.modules.get(network.family)?.swap;
  }

  supports(family: ChainFamily): boolean {
    return this.modules.has(family);
  }
}
