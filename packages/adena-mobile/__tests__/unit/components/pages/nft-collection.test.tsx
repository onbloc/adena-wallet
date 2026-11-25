import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { NftCollectionPage, NftCollectionPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<NftCollectionPageProps> = {}): NftCollectionPageProps => ({
  name: 'GnoPunks',
  subtitle: 'gno.land/r/demo/punks',
  stats: [{ label: 'Owned', value: '2' }, { label: 'Symbol', value: 'PUNK' }],
  items: [
    { key: 'punk-1', title: '#1', subtitle: 'Punk', imageUri: 'https://example.com/1.png', imageLoading: false },
    { key: 'punk-2', title: '#2', imageUri: null, imageLoading: true },
  ],
  loading: false,
  hasMore: true,
  loadingMore: false,
  onLoadMore: jest.fn(),
  onOpen: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('NftCollectionPage', () => {
  it('opens items and loads more', async () => {
    const page = props();

    await renderPage(<NftCollectionPage {...page} />);

    expect(screen.getByText('NFT collection')).toBeTruthy();
    expect(screen.getByText('GnoPunks')).toBeTruthy();
    expect(screen.getByText('gno.land/r/demo/punks')).toBeTruthy();
    expect(screen.getByText('PUNK')).toBeTruthy();
    expect(screen.getByText('Owned')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Punk #1' }));
    await fireEvent.press(screen.getByRole('button', { name: '#2' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Load more' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect((page.onOpen as jest.Mock).mock.calls).toEqual([['punk-1'], ['punk-2']]);
    expect(page.onLoadMore).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('No collectibles')).toBeNull();
  });

  it('shows the empty state once loaded without items', async () => {
    await renderPage(<NftCollectionPage {...props({ items: [], hasMore: false })} />);

    expect(screen.getByText('No collectibles')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });

  it('hides the empty state while loading', async () => {
    await renderPage(<NftCollectionPage {...props({ items: [], loading: true, hasMore: false })} />);

    expect(screen.queryByText('No collectibles')).toBeNull();
  });

  it('shows the error instead of the empty state', async () => {
    await renderPage(<NftCollectionPage {...props({ items: [], hasMore: false, error: 'Indexer unreachable' })} />);

    expect(screen.getByText('Unable to load collectibles')).toBeTruthy();
    expect(screen.getByText('Indexer unreachable')).toBeTruthy();
    expect(screen.queryByText('No collectibles')).toBeNull();
  });

  it('blocks load more while loading more', async () => {
    const page = props({ loadingMore: true });

    await renderPage(<NftCollectionPage {...page} />);

    expect(screen.getByText('Loading…')).toBeTruthy();
    await fireEvent.press(screen.getByText('Loading…'));
    expect(page.onLoadMore).not.toHaveBeenCalled();
  });
});
