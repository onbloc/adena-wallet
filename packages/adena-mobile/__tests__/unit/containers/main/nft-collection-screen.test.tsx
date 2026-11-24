import { act, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NftCollectionScreen } from '../../../../src/containers/main/nft-collection-screen/nft-collection-screen';
import { NftCollection } from '../../../../src/domain/nft';
import { ACCOUNT, createWrapper, NETWORK } from '../../../helpers/query-wrapper';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const PKG = 'gno.land/r/gnoswap/gnft';
const COLLECTION: NftCollection = { id: PKG, packagePath: PKG, name: 'GNFT', symbol: 'GNFT', ownedCount: 2, supportsTokenUri: true, supportsMetadata: false };

type Node = { parent: Node | null; props: { refreshControl?: { props: { onRefresh: () => void } } } };

// Walks up from a rendered element to the scroll view that owns the refresh control.
const refreshControlOf = (start: Node): { onRefresh: () => void } => {
  let node: Node | null = start;

  while (node && !node.props.refreshControl) {
    node = node.parent;
  }

  return node!.props.refreshControl!.props;
};

const item = (nftId: string) => ({ collectionId: PKG, packagePath: PKG, nftId, name: 'GNFT', symbol: 'GNFT' });

describe('NftCollectionScreen', () => {
  it('pull-to-refresh refetches the items and only the token URIs that came back empty or failed', async () => {
    const getTokenUri = jest.fn(async (_network: unknown, _pkg: string, id: string) => {
      if (id === '3') {
        throw new Error('rpc down');
      }

      return id === '1' ? null : `https://img/${id}`;
    });
    const getItems = jest.fn(async () => ({ items: [item('1'), item('2'), item('3')], cursor: null, hasNext: false }));
    const { Wrapper } = createWrapper({
      accountService: { getCurrentAccount: () => ACCOUNT, getAccounts: () => [ACCOUNT], getAddress: () => 'g1owner' },
      networkService: { getCurrentNetwork: () => NETWORK, getNetworks: () => [NETWORK] },
      nftService: { getItems, getTokenUri },
    });
    const Screen = NftCollectionScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Wrapper><Screen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} route={{ key: 'c', name: 'NftCollection', params: { collection: COLLECTION } }} /></Wrapper>
      </SafeAreaProvider>,
    );

    await waitFor(() => expect(getTokenUri).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.getByRole('button', { name: 'GNFT #3' })).toBeTruthy());
    getTokenUri.mockClear();
    getTokenUri.mockImplementation(async (_network: unknown, _pkg: string, id: string) => `https://img/${id}`);

    await act(async () => {
      refreshControlOf(screen.getByText('Items') as unknown as Node).onRefresh();
    });

    await waitFor(() => expect(getItems).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getTokenUri.mock.calls.map(call => call[2]).sort()).toEqual(['1', '3']));
  });
});
