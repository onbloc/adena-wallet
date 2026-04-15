export * from './types';
export * from './registry';
export * from './entries';

import { TokenRegistryImpl } from './registry';
import { ALL_TOKENS } from './entries';

export const defaultTokenRegistry = new TokenRegistryImpl();

ALL_TOKENS.forEach((token) => defaultTokenRegistry.register(token));
