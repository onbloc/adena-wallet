import { useMemo } from 'react';

import { Chain } from 'adena-module';

import { useAdenaContext } from './use-context';

/**
 * Return the Chain definition (bech32 prefix, coinType, signing modes, fee
 * model) for the given chainGroup. Defaults to 'gno' because the current
 * wallet UX derives its single primary account on the Gno chain.
 *
 * Callers that need a chain other than Gno (e.g. Cosmos token transfer)
 * must pass the chainGroup explicitly — usually derived from the token
 * metainfo or a routing context.
 */
export const useChain = (chainGroup = 'gno'): Chain => {
  const { chainRegistry } = useAdenaContext();

  return useMemo(() => {
    const chain = chainRegistry.getChain(chainGroup);
    if (!chain) {
      throw new Error(`Chain not registered for chainGroup: ${chainGroup}`);
    }
    return chain;
  }, [chainRegistry, chainGroup]);
};
