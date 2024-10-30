import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

export const useGetGRC721Balance = (
  packagePath: string,
  options?: UseQueryOptions<number | null, Error>,
): UseQueryResult<number | null> => {
  const { tokenService } = useAdenaContext();
  const { currentAddress } = useCurrentAccount();

  return useQuery<number | null, Error>({
    queryKey: ['nft/useGetGRC721TokenBalance', packagePath, currentAddress],
    queryFn: () => {
      if (!currentAddress) {
        return null;
      }

      return tokenService.fetchGRC721Balance(packagePath, currentAddress).catch(() => null);
    },
    staleTime: Infinity,
    ...options,
  });
};
