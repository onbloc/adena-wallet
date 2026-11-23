import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { AddTokenPage, AddTokenPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<AddTokenPageProps> = {}): AddTokenPageProps => ({
  query: 'foo',
  onChangeQuery: jest.fn(),
  results: [
    { key: 'gno.land/r/demo/foo.FOO', symbol: 'FOO', name: 'Foo', added: false },
    { key: 'gno.land/r/demo/bar.BAR', symbol: 'BAR', name: 'Bar', imageUrl: 'https://example.com/bar.png', added: true },
  ],
  loading: false,
  hasMore: true,
  loadingMore: false,
  onLoadMore: jest.fn(),
  onAdd: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('AddTokenPage', () => {
  it('lists registry tokens and reports actions', async () => {
    const page = props();

    await renderPage(<AddTokenPage {...page} />);

    expect(screen.getByText('Foo (FOO)')).toBeTruthy();
    expect(screen.getByText('gno.land/r/demo/bar.BAR')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Name, symbol or gno.land/r/….SYMBOL'), 'bar');
    await fireEvent.press(screen.getByRole('button', { name: 'Clear' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Added' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Load more' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onChangeQuery).toHaveBeenCalledWith('bar');
    expect(page.onChangeQuery).toHaveBeenCalledWith('');
    expect(page.onAdd).toHaveBeenCalledTimes(1);
    expect(page.onAdd).toHaveBeenCalledWith('gno.land/r/demo/foo.FOO');
    expect(page.onLoadMore).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('No tokens found')).toBeNull();
  });

  it('shows the empty state and error, and hides load more', async () => {
    await renderPage(<AddTokenPage {...props({ results: [], hasMore: false, error: 'Registry unavailable' })} />);

    expect(screen.getByText('No tokens found')).toBeTruthy();
    expect(screen.getByText('Registry unavailable')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });

  it('hides the empty state while loading and shows in-flight labels', async () => {
    const page = props({ results: [{ key: 'k', symbol: 'K', name: 'K', added: false }], addingKey: 'k', loadingMore: true });

    await renderPage(<AddTokenPage {...page} />);
    expect(screen.getByText('Adding')).toBeTruthy();
    expect(screen.getByText('Loading…')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(page.onAdd).not.toHaveBeenCalled();

    await renderPage(<AddTokenPage {...props({ results: [], loading: true })} />);
    expect(screen.queryByText('No tokens found')).toBeNull();
  });
});
