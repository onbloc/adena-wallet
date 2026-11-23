import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { ActivityPage, ActivityPageProps } from '../../../../src/components/pages';
import { AmountTone } from '../../../../src/components/view-models';
import { renderPage } from './render-page';

type Node = { parent: Node | null; props: { refreshControl?: { props: { onRefresh: () => void; refreshing: boolean } } } };

const refreshControlOf = (start: Node): { onRefresh: () => void; refreshing: boolean } => {
  let node: Node | null = start;

  while (node && !node.props.refreshControl) {
    node = node.parent;
  }

  return node!.props.refreshControl!.props;
};

const props = (overrides: Partial<ActivityPageProps> = {}): ActivityPageProps => ({
  sections: [
    {
      title: 'Today',
      items: [
        { key: 'tx-1', title: 'Sent', description: 'To g1abc…wxyz', amountLabel: '-1 GNOT', tone: AmountTone.DEFAULT, failed: false, icon: 'swap' },
        { key: 'tx-2', title: 'Received', amountLabel: '+2 GNOT', tone: AmountTone.POSITIVE, failed: true, extraInfo: '+1', icon: 'activity' },
      ],
    },
  ],
  loading: false,
  supported: true,
  hasMore: true,
  loadingMore: false,
  onLoadMore: jest.fn(),
  onOpen: jest.fn(),
  refreshing: false,
  onRefresh: jest.fn(),
  ...overrides,
});

describe('ActivityPage', () => {
  it('lists activity and reports open, load more and refresh', async () => {
    const page = props();

    await renderPage(<ActivityPage {...page} />);

    expect(screen.getByText('Activity')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Sent, To g1abc…wxyz, -1 GNOT' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Received, +2 GNOT, Failed' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Load more' }));
    await act(() => refreshControlOf(screen.getByText('Today')).onRefresh());

    expect(page.onOpen).toHaveBeenNthCalledWith(1, 'tx-1');
    expect(page.onOpen).toHaveBeenNthCalledWith(2, 'tx-2');
    expect(page.onLoadMore).toHaveBeenCalledTimes(1);
    expect(page.onRefresh).toHaveBeenCalledTimes(1);
    expect(page.onRefresh).toHaveBeenCalledWith();
  });

  it('passes the refreshing flag to the refresh control', async () => {
    await renderPage(<ActivityPage {...props({ refreshing: true })} />);

    expect(refreshControlOf(screen.getByText('Today')).refreshing).toBe(true);
  });

  it('renders empty, loading, error and unsupported states', async () => {
    const { rerender } = await renderPage(<ActivityPage {...props({ sections: [] })} />);

    expect(screen.getByText('No activity yet')).toBeTruthy();

    await rerender(<ActivityPage {...props({ loading: true })} />);
    expect(screen.queryByText('Today')).toBeNull();

    await rerender(<ActivityPage {...props({ error: 'Indexer down' })} />);
    expect(screen.getByText('Unable to load activity')).toBeTruthy();
    expect(screen.getByText('Indexer down')).toBeTruthy();

    await rerender(<ActivityPage {...props({ supported: false })} />);
    expect(screen.getByText('History is not available')).toBeTruthy();
  });

  it('hides load more when there is nothing more', async () => {
    await renderPage(<ActivityPage {...props({ hasMore: false })} />);

    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });
});
