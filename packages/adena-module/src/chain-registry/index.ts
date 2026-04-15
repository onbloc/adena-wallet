export * from './types';
export * from './registry';
export * from './entries/gno';
export * from './entries/atomone';

import { ChainRegistryImpl } from './registry';
import { GNO_CHAINS } from './entries/gno';
import { ATOMONE_CHAINS } from './entries/atomone';

export const defaultChainRegistry = new ChainRegistryImpl();

const ALL_CHAINS = [...GNO_CHAINS, ...ATOMONE_CHAINS];
ALL_CHAINS.forEach((chain) => defaultChainRegistry.register(chain));
