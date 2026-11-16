import { renderHook } from '@testing-library/react';
import type { Mock } from 'vitest';

import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { GRC721CollectionModel } from '@types';
import { useNFTCollectionHandler } from './use-collection-handler';

vi.mock('@hooks/use-context', () => ({ useAdenaContext: vi.fn() }));
vi.mock('@hooks/use-current-account', () => ({ useCurrentAccount: vi.fn() }));
vi.mock('@hooks/use-network', () => ({ useNetwork: vi.fn() }));

const PACKAGE_PATH = 'gno.land/r/gnoswap/gnft';

function collection(overrides: Partial<GRC721CollectionModel> = {}): GRC721CollectionModel {
  return {
    tokenId: '',
    collectionId: 'gno.land/r/gnoswap/gnft.GNFT.0000000',
    networkId: 'gnoland-1',
    display: false,
    type: 'grc721',
    packagePath: PACKAGE_PATH,
    name: 'GNOSWAP NFT',
    symbol: 'GNFT',
    image: '',
    isTokenUri: false,
    isMetadata: false,
    ...overrides,
  };
}

function setup(stored: GRC721CollectionModel[]): { saveAccountGRC721Collections: Mock } {
  const saveAccountGRC721Collections = vi.fn().mockResolvedValue(true);

  (useAdenaContext as Mock).mockReturnValue({
    tokenService: {
      getAccountGRC721Collections: vi.fn().mockResolvedValue(stored),
      saveAccountGRC721Collections,
    },
  });
  (useCurrentAccount as Mock).mockReturnValue({ currentAccount: { id: 'account-1' } });
  (useNetwork as Mock).mockReturnValue({ currentNetwork: { chainId: 'gnoland-1' } });

  return { saveAccountGRC721Collections };
}

describe('useNFTCollectionHandler.addCollections', () => {
  beforeEach(() => {
  vi.clearAllMocks();
});

  it('refreshes a stored collection from the chain and keeps its display flag', async () => {
    const { saveAccountGRC721Collections } = setup([
      collection({ tokenId: '', display: false, isTokenUri: false }),
    ]);

    const { result } = renderHook(() => useNFTCollectionHandler());
    await result.current.addCollections([collection({ tokenId: '476', isTokenUri: true })]);

    expect(saveAccountGRC721Collections).toHaveBeenCalledWith('account-1', 'gnoland-1', [
      expect.objectContaining({ tokenId: '476', isTokenUri: true, display: false }),
    ]);
  });

  it('adds an unseen collection as displayed, without duplicating the stored one', async () => {
    const stored = collection({ display: true });
    const { saveAccountGRC721Collections } = setup([stored]);

    const added = collection({
      collectionId: 'gno.land/r/demo/nft.ITEM.0000000',
      packagePath: 'gno.land/r/demo/nft',
      name: 'Item',
      symbol: 'ITEM',
    });

    const { result } = renderHook(() => useNFTCollectionHandler());
    await result.current.addCollections([collection({ tokenId: '476' }), added]);

    const [, , saved] = saveAccountGRC721Collections.mock.calls[0];
    expect(saved).toHaveLength(2);
    expect(saved[0]).toEqual(expect.objectContaining({ packagePath: PACKAGE_PATH, display: true }));
    expect(saved[1]).toEqual(
      expect.objectContaining({ packagePath: 'gno.land/r/demo/nft', display: true }),
    );
  });
});
