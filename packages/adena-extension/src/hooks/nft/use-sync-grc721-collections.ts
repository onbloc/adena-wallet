import { useQuery, useQueryClient, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { useNFTCollectionHandler } from './use-collection-handler';
import { GET_GRC721_COLLECTIONS_QUERY_KEY } from './use-get-grc721-collections';

export const SYNC_GRC721_COLLECTIONS_QUERY_KEY = 'nft/useSyncGRC721Collections';

// Mirrors wallet-main's TOKEN_DISCOVERY_INTERVAL: a newly received NFT shows up
// on the next visit to the tab, without a walk on every navigation.
const COLLECTION_DISCOVERY_STALE_TIME = 60_000;

/**
 * Discovers the account's GRC721 collections from the indexer/RPC and merges
 * them into storage.
 *
 * This is an indexer walk, not a storage read, and it used to run as part of
 * the main screen's token discovery — where nothing consumed it, and awaiting
 * it held up the token list. Mount it on the screens that actually show NFTs;
 * everywhere else reads what this leaves behind via useGetGRC721Collections.
 */
export const useSyncGRC721Collections = (
  options?: UseQueryOptions<boolean, Error>,
): UseQueryResult<boolean> => {
  const { tokenService } = useAdenaContext();
  const { currentAccount, currentFundingAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const { addCollections } = useNFTCollectionHandler();
  const queryClient = useQueryClient();

  return useQuery<boolean, Error>({
    queryKey: [
      SYNC_GRC721_COLLECTIONS_QUERY_KEY,
      currentAccount?.id || '',
      currentNetwork.chainId,
      currentFundingAddress || '',
    ],
    queryFn: async () => {
      if (!currentFundingAddress) {
        return false;
      }

      const collections = await tokenService
        .fetchAccountGRC721Collections(currentFundingAddress)
        .catch(() => []);

      // The full discovered list: addCollections dedupes new entries and
      // refreshes the ones already stored, preserving the user's display flag.
      await addCollections(collections);
      // Storage changed underneath the readers, so make them re-read.
      await queryClient.invalidateQueries([GET_GRC721_COLLECTIONS_QUERY_KEY]);

      return true;
    },
    enabled: !!currentAccount && !!currentFundingAddress,
    // Re-walk when the tab is opened and the last walk has aged out, matching
    // the discovery cadence the main screen used to run. Inside that window a
    // remount reads what the previous walk already wrote to storage.
    staleTime: COLLECTION_DISCOVERY_STALE_TIME,
    refetchOnMount: true,
    ...options,
  });
};
