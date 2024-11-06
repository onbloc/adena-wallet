import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

export const GET_GRC721_BALANCE_QUERY_KEY = 'nft/useGetGRC721TokenBalance';

export const useGetGRC721Balance = (
  packagePath: string,
  options?: UseQueryOptions<number | null, Error>,
): UseQueryResult<number | null> => {
  const { tokenService } = useAdenaContext();
  const { currentAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();

  return useQuery<number | null, Error>({
    queryKey: [GET_GRC721_BALANCE_QUERY_KEY, packagePath, currentAddress, currentNetwork.chainId],
    queryFn: () => {
      if (!currentAddress) {
        return null;
      }

      return tokenService.fetchGRC721Balance(packagePath, currentAddress).catch(() => null);
    },
    staleTime: 0,
    ...options,
  });
};
