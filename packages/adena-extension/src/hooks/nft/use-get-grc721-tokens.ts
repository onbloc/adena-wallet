import { useCurrentAccount } from '@hooks/use-current-account';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GRC721Model } from '@types';

export const useGetGRC721Tokens = (
  packagePath: string,
  options?: UseQueryOptions<GRC721Model[] | null, Error>,
): UseQueryResult<GRC721Model[] | null> => {
  // const { tokenService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();

  return useQuery<GRC721Model[] | null, Error>({
    queryKey: ['nft/useGetGRC721Tokens', currentAccount?.id || '', packagePath],
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
          metadata: null,
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
          metadata: null,
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
          metadata: null,
        },
      ];

      // return tokenService.getAccountGRC721Collections(currentAccount.id).catch(() => []);
    },
    staleTime: Infinity,
    keepPreviousData: true,
    ...options,
  });
};
