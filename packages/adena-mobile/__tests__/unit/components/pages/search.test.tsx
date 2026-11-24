import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { SearchPage, SearchPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const address = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const props = (overrides: Partial<SearchPageProps> = {}): SearchPageProps => ({
  query: 'gn',
  onChangeQuery: jest.fn(),
  scopeLabel: 'All networks',
  onToggleScope: jest.fn(),
  searching: true,
  tokens: [{ key: 'token:1', name: 'Gno.land', symbol: 'GNOT', localIcon: 'gnot', caption: 'GNOT' }],
  wallets: [{ key: 'account:1', name: 'Gnome', address, avatarColor: 'teal' }],
  collections: [{ key: 'col', name: 'Gnome Punks', caption: 'Gno.land · NFT collection', imageUri: null, imageLoading: false }],
  onOpenToken: jest.fn(),
  onOpenWallet: jest.fn(),
  onOpenCollection: jest.fn(),
  onConfirmNetworkSwitch: jest.fn(),
  onCancelNetworkSwitch: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('SearchPage', () => {
  it('renders grouped results and reports every action', async () => {
    const page = props();

    await renderPage(<SearchPage {...page} />);

    expect(screen.getByText('Tokens')).toBeTruthy();
    expect(screen.getByText('Wallets')).toBeTruthy();
    expect(screen.getByText('NFT collections')).toBeTruthy();
    expect(screen.getByText('g1jg...sqf5')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Tokens, wallets or collections'), 'gno');
    await fireEvent.press(screen.getByRole('button', { name: 'Clear' }));
    await fireEvent.press(screen.getByRole('button', { name: 'All networks' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Gno.land, GNOT' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Gnome, g1jg...sqf5' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Gnome Punks, Gno.land · NFT collection' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onChangeQuery).toHaveBeenNthCalledWith(1, 'gno');
    expect(page.onChangeQuery).toHaveBeenNthCalledWith(2, '');
    expect(page.onToggleScope).toHaveBeenCalledTimes(1);
    expect(page.onOpenToken).toHaveBeenCalledWith('token:1');
    expect(page.onOpenWallet).toHaveBeenCalledWith('account:1');
    expect(page.onOpenCollection).toHaveBeenCalledWith('col');
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows a hint before searching and an empty state without results', async () => {
    const { rerender } = await renderPage(<SearchPage {...props({ query: '', searching: false })} />);

    expect(screen.getByText('Search your wallet')).toBeTruthy();
    expect(screen.queryByText('Tokens')).toBeNull();

    await rerender(<SearchPage {...props({ query: ' zzz ', tokens: [], wallets: [], collections: [] })} />);
    expect(screen.getByText('No results for "zzz"')).toBeTruthy();
  });

  it('asks before switching networks', async () => {
    const page = props({ networkSwitch: { title: 'Switch to Gno.land Testnet?', description: 'GNOT is on Gno.land Testnet.' } });

    await renderPage(<SearchPage {...page} />);
    expect(screen.getByText('Switch to Gno.land Testnet?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Switch' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(page.onConfirmNetworkSwitch).toHaveBeenCalledTimes(1);
    expect(page.onCancelNetworkSwitch).toHaveBeenCalledTimes(1);
  });
});
