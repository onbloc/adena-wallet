import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

export const GET_GRC721_BALANCE_QUERY_KEY = 'nft/useGetGRC721TokenBalance';

const GRC721_BALANCE_STALE_TIME = 30_000;

export const useGetGRC721Balance = (
  packagePath: string,
  options?: UseQueryOptions<number | null, Error>,
): UseQueryResult<number | null> => {
  const { tokenService } = useAdenaContext();
  const { currentFundingAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();

  return useQuery<number | null, Error>({
    queryKey: [
      GET_GRC721_BALANCE_QUERY_KEY,
      packagePath,
      currentFundingAddress,
      currentNetwork.chainId,
    ],
    queryFn: () => {
      if (!currentFundingAddress) {
        return null;
      }

      return tokenService.fetchGRC721Balance(packagePath, currentFundingAddress).catch(() => null);
    },
    // One `BalanceOf` qeval per collection card, so an uncached mount replays the
    // whole fan-out.
    staleTime: GRC721_BALANCE_STALE_TIME,
    ...options,
  });
};
