import { useIsFetching } from '@tanstack/react-query';
import { GET_GRC721_BALANCE_QUERY_KEY } from './use-get-grc721-balance';
import { GET_GRC721_COLLECTIONS_QUERY_KEY } from './use-get-grc721-collections';
import { GET_GRC721_TOKEN_URI_QUERY_KEY } from './use-get-grc721-token-uri';

export const useIsLoadingNFT = (): number => {
  return useIsFetching({
    predicate: (query) => {
      return (
        Array.isArray(query.queryKey) &&
        query.state.data === undefined &&
        [
          GET_GRC721_COLLECTIONS_QUERY_KEY,
          GET_GRC721_BALANCE_QUERY_KEY,
          GET_GRC721_TOKEN_URI_QUERY_KEY,
        ].includes(query.queryKey[0])
      );
    },
  });
};
