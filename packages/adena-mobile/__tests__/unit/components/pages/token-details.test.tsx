import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { TokenDetailsPage, TokenDetailsPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

type Range = '1D' | '1W' | '1M';

const props = (overrides: Partial<TokenDetailsPageProps<Range>> = {}): TokenDetailsPageProps<Range> => ({
  asset: { key: 'ugnot', symbol: 'GNOT', name: 'Gno.land', quantity: '1,234.5', value: '$12.00', trend: 'neutral', loading: false },
  about: 'Gno.land is a smart contract platform.',
  market: {
    priceLabel: '$1.23',
    changeLabel: '+2.0%',
    changeColor: 'success',
    chart: [1, 2, 3],
    loading: false,
    stats: [{ label: 'Market cap', value: '$1M' }],
    links: [{ label: 'Website', url: 'https://gno.land' }, { label: 'Docs', url: 'https://docs.gno.land' }],
  },
  ranges: ['1D', '1W', '1M'],
  range: '1D',
  onRangeChange: jest.fn(),
  balanceValueLabel: '$1,518.43',
  activity: {
    sections: [{ title: 'Today', items: [{ key: 'tx1', title: 'Send', description: 'To g1abc', amountLabel: '-1 GNOT', tone: 'default', failed: false, icon: 'swap' }] }],
    loading: false,
    supported: true,
    hasMore: true,
    loadingMore: false,
    onLoadMore: jest.fn(),
    onOpen: jest.fn(),
  },
  refreshing: false,
  onRefresh: jest.fn(),
  onSend: jest.fn(),
  onReceive: jest.fn(),
  onOpenLink: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('TokenDetailsPage', () => {
  it('renders market data and reports every action', async () => {
    const page = props();

    await renderPage(<TokenDetailsPage {...page} />);

    expect(screen.getByText('$1.23')).toBeTruthy();
    expect(screen.getByText('+2.0%')).toBeTruthy();
    expect(screen.getByText('$1,518.43')).toBeTruthy();
    expect(screen.getByText('$1M')).toBeTruthy();
    expect(screen.getByText('About Gno.land')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    await fireEvent.press(screen.getByRole('tab', { name: '1W' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Read more' }));
    expect(screen.getByText('Show less')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.getByText('Read more')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Docs' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Website' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Send, To g1abc, -1 GNOT' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Load more' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Receive' }));

    expect(page.onBack).toHaveBeenCalledTimes(1);
    expect(page.onRangeChange).toHaveBeenCalledWith('1W');
    expect(page.onOpenLink).toHaveBeenNthCalledWith(1, 'https://docs.gno.land');
    expect(page.onOpenLink).toHaveBeenNthCalledWith(2, 'https://gno.land');
    expect(page.activity.onOpen).toHaveBeenCalledWith('tx1');
    expect(page.activity.onLoadMore).toHaveBeenCalledTimes(1);
    expect(page.onSend).toHaveBeenCalledTimes(1);
    expect(page.onReceive).toHaveBeenCalledTimes(1);
  });

  it('falls back to placeholders when market data and optional sections are missing', async () => {
    const page = props({
      asset: { key: 'x', symbol: 'TKN', name: 'A very long token name that keeps going and going', trend: 'neutral', loading: true },
      about: undefined,
      balanceValueLabel: undefined,
      market: { changeColor: 'secondary', chart: [], loading: true, stats: [], links: [] },
      activity: { sections: [], loading: false, supported: true, hasMore: false, loadingMore: false, onLoadMore: jest.fn(), onOpen: jest.fn() },
    });

    await renderPage(<TokenDetailsPage {...page} />);

    expect(screen.getAllByText('–')).toHaveLength(2);
    expect(screen.queryByText('Stats')).toBeNull();
    expect(screen.queryByText('Value')).toBeNull();
    expect(screen.queryByText('Read more')).toBeNull();
    expect(screen.queryByText('Links')).toBeNull();
    expect(screen.getByText('No activity yet')).toBeTruthy();
  });

  it('shows activity errors and unsupported networks', async () => {
    const base = props();
    const { rerender } = await renderPage(<TokenDetailsPage {...props({ activity: { ...base.activity, error: 'Indexer down' } })} />);

    expect(screen.getByText('Indexer down')).toBeTruthy();

    await rerender(<TokenDetailsPage {...props({ activity: { ...base.activity, supported: false } })} />);
    expect(screen.queryByText('History is not available')).toBeTruthy();
  });

  it('shows the empty label instead of a chart when there is no history', async () => {
    const page = props();

    await renderPage(<TokenDetailsPage {...page} market={{ ...page.market, chart: [], loading: false, emptyLabel: 'Price history is not available on this network' }} />);

    expect(screen.getByText('Price history is not available on this network')).toBeTruthy();
  });
});
