import { ChainRegistryImpl } from './registry';
import { Chain, ChainRegistry, CosmosNetworkProfile, GnoNetworkProfile } from './types';

export interface CreateChainRegistryOptions {
  chains: Chain[];
  gnoNetworkProfiles: GnoNetworkProfile[];
  atomoneNetworkProfiles: CosmosNetworkProfile[];
}

// Every registered NetworkProfile must have a matching Chain entry — without
// it, chainRegistry.getChain(profile.chainGroup) returns undefined and
// consumers (balance fetch, address popover) silently drop that chain.
export function createChainRegistry(options: CreateChainRegistryOptions): ChainRegistry {
  const registry = new ChainRegistryImpl();

  options.chains.forEach((chain) => registry.registerChain(chain));
  options.gnoNetworkProfiles.forEach((profile) => registry.registerNetworkProfile(profile));
  options.atomoneNetworkProfiles.forEach((profile) => registry.registerNetworkProfile(profile));

  return registry;
}
