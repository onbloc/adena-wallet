import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React, { PropsWithChildren } from 'react';

import { AppContainer } from '../../../src/di/container';
import { ContainerProvider } from '../../../src/di/container-provider';
import { NftImageRequest, useNftImages } from '../../../src/hooks/use-nft-images';
import { NFT_MISS_STALE_TIME, refetchUnresolvedNftUris } from '../../../src/queries/nft.queries';
import { queryKeys } from '../../../src/queries/query-keys';
import { BUILT_IN_NETWORKS } from '../../../src/resources';

const network = BUILT_IN_NETWORKS[0];

describe('useNftImages', () => {
  it('resolves enabled requests with ids and skips the rest', async () => {
    const getTokenUri = jest.fn(async (_network: unknown, pkg: string, id: string) => (id === '2' ? null : `https://img/${pkg}/${id}`));
    const container = { nftService: { getTokenUri } } as unknown as AppContainer;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
    const wrapper = ({ children }: PropsWithChildren) => (
      <ContainerProvider container={container}><QueryClientProvider client={client}>{children}</QueryClientProvider></ContainerProvider>
    );
    const { result } = await renderHook(() => useNftImages(network, [
      { key: 'a', packagePath: 'gno.land/r/punks', nftId: '1', enabled: true },
      { key: 'b', packagePath: 'gno.land/r/punks', nftId: '2', enabled: true },
      { key: 'c', packagePath: 'gno.land/r/punks', enabled: true },
      { key: 'd', packagePath: 'gno.land/r/punks', nftId: '4', enabled: false },
    ]), { wrapper });

    expect(result.current.a.loading).toBe(true);
    expect(result.current.c).toEqual({ uri: null, loading: false });
    expect(result.current.d).toEqual({ uri: null, loading: false });
    await waitFor(() => expect(result.current.a).toEqual({ uri: 'https://img/gno.land/r/punks/1', loading: false }));
    expect(result.current.b).toEqual({ uri: null, loading: false });
    expect(getTokenUri).toHaveBeenCalledTimes(2);
  });

  it('returns an empty map for no requests', async () => {
    const container = { nftService: { getTokenUri: jest.fn() } } as unknown as AppContainer;
    const wrapper = ({ children }: PropsWithChildren) => (
      <ContainerProvider container={container}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } })}>{children}</QueryClientProvider></ContainerProvider>
    );
    const { result } = await renderHook(() => useNftImages(network, []), { wrapper });

    expect(result.current).toEqual({});
  });

  describe('failure recovery', () => {
    const PKG = 'gno.land/r/punks';
    const request = (nftId: string): NftImageRequest => ({ key: nftId, packagePath: PKG, nftId, enabled: true });
    const setup = (getTokenUri: jest.Mock, retry: number | false = false) => {
      const container = { nftService: { getTokenUri } } as unknown as AppContainer;
      const client = new QueryClient({ defaultOptions: { queries: { retry, retryDelay: 0, gcTime: Infinity } } });
      const wrapper = ({ children }: PropsWithChildren) => (
        <ContainerProvider container={container}><QueryClientProvider client={client}>{children}</QueryClientProvider></ContainerProvider>
      );

      return { client, wrapper };
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('surfaces an RPC failure as a query error that the retry policy recovers from', async () => {
      const getTokenUri = jest.fn().mockRejectedValueOnce(new Error('rpc down')).mockResolvedValue('https://img/1');
      const { wrapper } = setup(getTokenUri, 1);
      const { result } = await renderHook(() => useNftImages(network, [request('1')]), { wrapper });

      await waitFor(() => expect(result.current['1']).toEqual({ uri: 'https://img/1', loading: false }));
      expect(getTokenUri).toHaveBeenCalledTimes(2);
    });

    it('stops loading on a persistent failure instead of caching it as "no URI"', async () => {
      const getTokenUri = jest.fn().mockRejectedValue(new Error('rpc down'));
      const { client, wrapper } = setup(getTokenUri);
      const { result } = await renderHook(() => useNftImages(network, [request('1')]), { wrapper });

      await waitFor(() => expect(result.current['1']).toEqual({ uri: null, loading: false }));
      expect(client.getQueryState(queryKeys.nftUri(network.id, PKG, '1'))?.status).toBe('error');
    });

    it('re-checks a "no URI" answer after a short stale time but keeps found URIs', async () => {
      const getTokenUri = jest.fn(async (_n: unknown, _p: string, id: string) => (id === '1' ? null : `https://img/${id}`));
      const { wrapper } = setup(getTokenUri);
      const first = await renderHook(() => useNftImages(network, [request('1'), request('2')]), { wrapper });

      await waitFor(() => expect(first.result.current['2'].uri).toBe('https://img/2'));
      await first.unmount();
      const now = Date.now();

      jest.spyOn(Date, 'now').mockReturnValue(now + NFT_MISS_STALE_TIME + 1);
      await renderHook(() => useNftImages(network, [request('1'), request('2')]), { wrapper });

      await waitFor(() => expect(getTokenUri).toHaveBeenCalledTimes(3));
      expect(getTokenUri.mock.calls.map(call => call[2])).toEqual(['1', '2', '1']);
    });

    it('refetches only the null or failed URIs on refresh', async () => {
      const getTokenUri = jest.fn(async (_n: unknown, _p: string, id: string) => {
        if (id === '3') {
          throw new Error('rpc down');
        }

        return id === '1' ? null : `https://img/${id}`;
      });
      const { client, wrapper } = setup(getTokenUri);
      const { result } = await renderHook(() => useNftImages(network, [request('1'), request('2'), request('3')]), { wrapper });

      await waitFor(() => expect(result.current['3'].loading).toBe(false));
      getTokenUri.mockClear();
      getTokenUri.mockImplementation(async (_n: unknown, _p: string, id: string) => `https://img/${id}`);
      await act(async () => {
        await refetchUnresolvedNftUris(client, network.id);
      });

      expect(getTokenUri.mock.calls.map(call => call[2]).sort()).toEqual(['1', '3']);
      await waitFor(() => expect(result.current['3']).toEqual({ uri: 'https://img/3', loading: false }));
      expect(result.current['1'].uri).toBe('https://img/1');
    });
  });
});
