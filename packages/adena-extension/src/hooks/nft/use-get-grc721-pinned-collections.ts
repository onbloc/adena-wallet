import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

export const useGetGRC721PinnedCollections = (
  options?: UseQueryOptions<string[], Error>,
): UseQueryResult<string[]> => {
  const { tokenService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();

  return useQuery<string[], Error>({
    queryKey: [
      'nft/useGetGRC721PinnedCollections',
      currentAccount?.id || '',
      currentNetwork.chainId,
    ],
    queryFn: () => {
      if (!currentAccount) {
        return [];
      }

      return tokenService
        .getAccountGRC721PinnedPackages(currentAccount.id, currentNetwork.chainId)
        .catch(() => []);
    },
    ...options,
  });
};
