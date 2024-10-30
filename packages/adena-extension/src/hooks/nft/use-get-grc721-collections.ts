import { useCurrentAccount } from '@hooks/use-current-account';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GRC721CollectionModel } from '@types';

export const useGetGRC721Collections = (
  options?: UseQueryOptions<GRC721CollectionModel[] | null, Error>,
): UseQueryResult<GRC721CollectionModel[] | null> => {
  // const { tokenService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();

  return useQuery<GRC721CollectionModel[] | null, Error>({
    queryKey: ['nft/useGetGRC721Collections', currentAccount?.id || ''],
    queryFn: () => {
      if (!currentAccount) {
        return null;
      }

      return [
        {
          display: true,
          name: 'Gnopunks',
          networkId: '',
          packagePath: 'package path',
          symbol: '',
          tokenId: '0',
          type: 'grc721',
          isMetadata: false,
          isTokenUri: false,
        },
        {
          display: true,
          name: 'Gnopunks11',
          networkId: '',
          packagePath: 'package path',
          symbol: '',
          tokenId: '0',
          type: 'grc721',
          isMetadata: false,
          isTokenUri: false,
        },
        {
          display: true,
          name: 'Gnopunks22',
          networkId: '',
          packagePath: 'package path',
          symbol: '',
          tokenId: '0',
          type: 'grc721',
          isMetadata: false,
          isTokenUri: false,
        },
      ];

      // return tokenService.getAccountGRC721Collections(currentAccount.id).catch(() => []);
    },
    staleTime: Infinity,
    keepPreviousData: true,
    ...options,
  });
};
