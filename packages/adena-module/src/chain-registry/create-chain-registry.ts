import { ATOMONE_CHAIN, ATOMONE_NETWORK_PROFILES } from './entries/atomone';
import { GNO_CHAIN, GNO_NETWORK_PROFILES } from './entries/gno';
import { ChainRegistryImpl } from './registry';
import { ChainRegistry } from './types';

// Every registered NetworkProfile must have a matching Chain entry — without
// it, chainRegistry.getChain(profile.chainGroup) returns undefined and
// consumers (balance fetch, address popover) silently drop that chain.
export function createChainRegistry(): ChainRegistry {
  const registry = new ChainRegistryImpl();

  registry.registerChain(GNO_CHAIN);
  registry.registerChain(ATOMONE_CHAIN);

  [...GNO_NETWORK_PROFILES, ...ATOMONE_NETWORK_PROFILES].forEach((profile) =>
    registry.register(profile),
  );

  return registry;
}
