import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import React, { PropsWithChildren } from 'react';

import { AppContainer } from '../../../src/di/container';
import { ContainerProvider } from '../../../src/di/container-provider';
import { useNftImages } from '../../../src/hooks/use-nft-images';
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
});
