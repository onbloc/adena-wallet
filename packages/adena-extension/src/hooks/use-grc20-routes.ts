import { useQuery, UseQueryResult } from '@tanstack/react-query';

import { Grc20RouteMap } from '@types';

import { useAdenaContext } from './use-context';
import { useNetwork } from './use-network';

/**
 * GRC20 `routes` for the current network, keyed by registry key. Read from the
 * resource file rather than the stored token metainfos, which are persisted per
 * account and can predate the field.
 */
export const useGRC20Routes = (): UseQueryResult<Grc20RouteMap> => {
  const { tokenService } = useAdenaContext();
  const { currentNetwork } = useNetwork();

  return useQuery<Grc20RouteMap>(
    ['useGRC20Routes', currentNetwork?.networkId],
    () => tokenService.fetchGrc20Routes(),
    {
      staleTime: Infinity,
      enabled: !!currentNetwork?.networkId,
    },
  );
};
