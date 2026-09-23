import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { GRC721CollectionModel } from '@types';
import { useNFTCollectionHandler } from './use-collection-handler';
import { useSyncGRC721Collections } from './use-sync-grc721-collections';

jest.mock('@hooks/use-context', () => ({ useAdenaContext: jest.fn() }));
jest.mock('@hooks/use-current-account', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@hooks/use-network', () => ({ useNetwork: jest.fn() }));
jest.mock('./use-collection-handler', () => ({ useNFTCollectionHandler: jest.fn() }));

const ADDRESS = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const COLLECTION = {
  tokenId: '',
  collectionId: 'gno.land/r/gnoswap/gnft.GNFT.0000000',
  networkId: 'gnoland-1',
  display: false,
  type: 'grc721',
  packagePath: 'gno.land/r/gnoswap/gnft',
  name: 'GNOSWAP NFT',
  symbol: 'GNFT',
  image: '',
  isTokenUri: false,
  isMetadata: false,
} as GRC721CollectionModel;

function setup({
  fundingAddress = ADDRESS as string | null,
  collections = [COLLECTION],
}: { fundingAddress?: string | null; collections?: GRC721CollectionModel[] } = {}): {
  fetchAccountGRC721Collections: jest.Mock;
  addCollections: jest.Mock;
  wrapper: React.FC<React.PropsWithChildren<unknown>>;
} {
  const fetchAccountGRC721Collections = jest.fn().mockResolvedValue(collections);
  const addCollections = jest.fn().mockResolvedValue(true);

  (useAdenaContext as jest.Mock).mockReturnValue({
    tokenService: { fetchAccountGRC721Collections },
  });
  (useCurrentAccount as jest.Mock).mockReturnValue({
    currentAccount: { id: 'account-1' },
    currentFundingAddress: fundingAddress,
  });
  (useNetwork as jest.Mock).mockReturnValue({ currentNetwork: { chainId: 'gnoland-1' } });
  (useNFTCollectionHandler as jest.Mock).mockReturnValue({ addCollections });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { fetchAccountGRC721Collections, addCollections, wrapper };
}

describe('useSyncGRC721Collections', () => {
  beforeEach(() => jest.clearAllMocks());

  it('walks the indexer once and merges what it finds into storage', async () => {
    const { fetchAccountGRC721Collections, addCollections, wrapper } = setup();

    const { result } = renderHook(() => useSyncGRC721Collections(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchAccountGRC721Collections).toHaveBeenCalledWith(ADDRESS);
    expect(addCollections).toHaveBeenCalledWith([COLLECTION]);
  });

  it('does not walk without a funding address to walk for', async () => {
    const { fetchAccountGRC721Collections, wrapper } = setup({ fundingAddress: null });

    const { result } = renderHook(() => useSyncGRC721Collections(), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetchAccountGRC721Collections).not.toHaveBeenCalled();
  });

  it('leaves storage alone when discovery fails rather than clearing it', async () => {
    const { addCollections, wrapper } = setup();
    (useAdenaContext as jest.Mock).mockReturnValue({
      tokenService: {
        fetchAccountGRC721Collections: jest.fn().mockRejectedValue(new Error('indexer down')),
      },
    });

    const { result } = renderHook(() => useSyncGRC721Collections(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // addCollections is a no-op for an empty list, so nothing stored is lost.
    expect(addCollections).toHaveBeenCalledWith([]);
  });
});
