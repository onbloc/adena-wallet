import { act, renderHook, waitFor } from '@testing-library/react-native';

import { NftCollection } from '../../../src/domain/nft';
import { useNftCollectionsQuery, useNftItemsQuery, useNftMetadataQuery, useNftTokenUriQuery } from '../../../src/queries/nft.queries';
import { queryKeys } from '../../../src/queries/query-keys';
import { ACCOUNT, createWrapper, NETWORK } from '../../helpers/query-wrapper';

const COLLECTION: NftCollection = { id: 'col', packagePath: 'gno.land/r/nft', name: 'N', symbol: 'N', ownedCount: 2, supportsTokenUri: true, supportsMetadata: true };

const nftService = (supported = true) => ({
  isSupported: jest.fn().mockReturnValue(supported),
  getCollections: jest.fn().mockResolvedValue([COLLECTION]),
  getItems: jest.fn()
    .mockResolvedValueOnce({ items: [{ nftId: '1' }], cursor: 'next', hasNext: true })
    .mockResolvedValueOnce({ items: [{ nftId: '2' }], cursor: null, hasNext: false }),
  getTokenUri: jest.fn().mockResolvedValue('https://x/1.png'),
  getMetadata: jest.fn().mockResolvedValue({ name: 'One', attributes: [] }),
});

describe('useNftCollectionsQuery', () => {
  it('loads collections for the account', async () => {
    const service = nftService();
    const { Wrapper } = createWrapper({ nftService: service });
    const { result } = await renderHook(() => useNftCollectionsQuery(ACCOUNT, NETWORK), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toEqual([COLLECTION]));
    expect(service.getCollections).toHaveBeenCalledWith(ACCOUNT, NETWORK);
  });

  it('stays idle without an account or support', async () => {
    const service = nftService(false);
    const { Wrapper, client } = createWrapper({ nftService: service });

    await renderHook(() => useNftCollectionsQuery(ACCOUNT, NETWORK), { wrapper: Wrapper });
    await renderHook(() => useNftCollectionsQuery(null, NETWORK), { wrapper: Wrapper });
    expect(service.getCollections).not.toHaveBeenCalled();
    expect(client.getQueryCache().find({ queryKey: queryKeys.nftCollections(NETWORK.id, 'none') })).toBeDefined();
  });
});

describe('useNftItemsQuery', () => {
  it('pages through items', async () => {
    const service = nftService();
    const { Wrapper } = createWrapper({ nftService: service });
    const { result } = await renderHook(() => useNftItemsQuery(ACCOUNT, NETWORK, COLLECTION), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    expect(service.getItems).toHaveBeenLastCalledWith(ACCOUNT, NETWORK, COLLECTION, null);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(service.getItems).toHaveBeenLastCalledWith(ACCOUNT, NETWORK, COLLECTION, 'next');
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
  });

  it('stays idle without an account or collection', async () => {
    const service = nftService();
    const { Wrapper, client } = createWrapper({ nftService: service });

    await renderHook(() => useNftItemsQuery(ACCOUNT, NETWORK), { wrapper: Wrapper });
    await renderHook(() => useNftItemsQuery(null, NETWORK, COLLECTION), { wrapper: Wrapper });
    expect(service.getItems).not.toHaveBeenCalled();
    expect(client.getQueryCache().find({ queryKey: queryKeys.nftItems(NETWORK.id, ACCOUNT.id, 'none') })).toBeDefined();
    expect(client.getQueryCache().find({ queryKey: queryKeys.nftItems(NETWORK.id, 'none', 'col') })).toBeDefined();
  });
});

describe('useNftTokenUriQuery', () => {
  it('loads the token uri', async () => {
    const service = nftService();
    const { Wrapper } = createWrapper({ nftService: service });
    const { result } = await renderHook(() => useNftTokenUriQuery(NETWORK, 'gno.land/r/nft', '1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toBe('https://x/1.png'));
    expect(service.getTokenUri).toHaveBeenCalledWith(NETWORK, 'gno.land/r/nft', '1');
  });

  it('stays idle when disabled or without an id', async () => {
    const service = nftService();
    const { Wrapper, client } = createWrapper({ nftService: service });

    await renderHook(() => useNftTokenUriQuery(NETWORK, 'p', '1', false), { wrapper: Wrapper });
    await renderHook(() => useNftTokenUriQuery(NETWORK, 'p'), { wrapper: Wrapper });
    expect(service.getTokenUri).not.toHaveBeenCalled();
    expect(client.getQueryCache().find({ queryKey: queryKeys.nftUri(NETWORK.id, 'p', '') })).toBeDefined();
  });
});

describe('useNftMetadataQuery', () => {
  it('loads metadata', async () => {
    const service = nftService();
    const { Wrapper } = createWrapper({ nftService: service });
    const { result } = await renderHook(() => useNftMetadataQuery(NETWORK, 'p', '1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ name: 'One', attributes: [] }));
    expect(service.getMetadata).toHaveBeenCalledWith(NETWORK, 'p', '1');
  });

  it('stays idle when disabled', async () => {
    const service = nftService();
    const { Wrapper } = createWrapper({ nftService: service });
    const { result } = await renderHook(() => useNftMetadataQuery(NETWORK, 'p', '1', false), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(service.getMetadata).not.toHaveBeenCalled();
  });
});
