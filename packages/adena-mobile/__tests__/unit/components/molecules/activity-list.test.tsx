import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ActivityList, ActivityListProps } from '../../../../src/components/molecules';

const props = (overrides: Partial<ActivityListProps> = {}): ActivityListProps => ({
  sections: [
    {
      title: 'Today',
      items: [
        { key: 'h1', title: 'Send', description: 'To g1abc', amountLabel: '-1 GNOT', tone: 'default', failed: false, icon: 'swap' },
        { key: 'h2', title: 'Call', tone: 'muted', failed: true, extraInfo: 'Increment', icon: 'link' },
      ],
    },
  ],
  loading: false,
  supported: true,
  hasMore: false,
  loadingMore: false,
  onLoadMore: jest.fn(),
  onOpen: jest.fn(),
  ...overrides,
});

describe('ActivityList', () => {
  it('shows an unsupported notice first', async () => {
    await render(<ActivityList {...props({ supported: false, loading: true, error: 'x' })} />);
    expect(screen.getByText('History is not available')).toBeTruthy();
  });

  it('shows skeletons while loading', async () => {
    await render(<ActivityList {...props({ loading: true })} />);
    expect(screen.getAllByLabelText('Loading')).toHaveLength(3);
  });

  it('shows the error', async () => {
    await render(<ActivityList {...props({ error: 'Network down' })} />);
    expect(screen.getByText('Unable to load activity')).toBeTruthy();
    expect(screen.getByText('Network down')).toBeTruthy();
  });

  it('shows an empty state for no sections', async () => {
    await render(<ActivityList {...props({ sections: [] })} />);
    expect(screen.getByText('No activity yet')).toBeTruthy();
  });

  it('opens rows by key and hides load more without more pages', async () => {
    const list = props();

    await render(<ActivityList {...list} />);
    expect(screen.getByText('Today')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Send, To g1abc, -1 GNOT' }));
    expect(list.onOpen).toHaveBeenCalledWith('h1');
    expect(screen.queryByText('Load more')).toBeNull();
  });

  it('loads more and shows the loading label', async () => {
    const list = props({ hasMore: true });
    const { rerender } = await render(<ActivityList {...list} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Load more' }));
    expect(list.onLoadMore).toHaveBeenCalledTimes(1);
    await rerender(<ActivityList {...list} loadingMore />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });
});
