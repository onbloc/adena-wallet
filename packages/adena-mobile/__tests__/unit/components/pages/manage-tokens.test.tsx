import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { ManageTokensPage, ManageTokensPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<ManageTokensPageProps> = {}): ManageTokensPageProps => ({
  query: 'gn',
  onChangeQuery: jest.fn(),
  tokens: [
    { key: 'ugnot', symbol: 'GNOT', name: 'Gno.land', localIcon: 'gnot', quantity: '0 GNOT', trend: 'neutral', loading: false, visible: true, locked: true },
    { key: 'gno.land/r/demo/foo', symbol: 'FOO', name: 'Foo token', imageUrl: 'https://example.com/foo.png', trend: 'positive', loading: false, visible: false, locked: false },
  ],
  onToggle: jest.fn(),
  onAddToken: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('ManageTokensPage', () => {
  it('searches, toggles tokens and adds a custom token', async () => {
    const page = props();

    await renderPage(<ManageTokensPage {...page} />);

    expect(screen.getByText('0 GNOT')).toBeTruthy();
    expect(screen.getByText('FOO')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Search tokens'), 'foo');
    await fireEvent.press(screen.getByRole('button', { name: 'Clear' }));
    await fireEvent.press(screen.getByRole('switch', { name: 'Show FOO' }));
    await fireEvent.press(screen.getByRole('switch', { name: 'Show GNOT' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add custom token' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onChangeQuery).toHaveBeenNthCalledWith(1, 'foo');
    expect(page.onChangeQuery).toHaveBeenNthCalledWith(2, '');
    expect(page.onToggle).toHaveBeenCalledTimes(1);
    expect(page.onToggle).toHaveBeenCalledWith('gno.land/r/demo/foo', true);
    expect(page.onAddToken).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('hides the add button and renders an empty list', async () => {
    await renderPage(<ManageTokensPage {...props({ tokens: [], onAddToken: undefined, query: '' })} />);

    expect(screen.queryByRole('button', { name: 'Add custom token' })).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
