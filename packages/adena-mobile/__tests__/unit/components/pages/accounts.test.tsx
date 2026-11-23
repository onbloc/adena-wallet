import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { AccountsPage, AccountsPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<AccountsPageProps> = {}): AccountsPageProps => ({
  accounts: [
    { id: 'a1', name: 'Account 1', address: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5', sourceLabel: 'Recovery phrase', selected: true },
    { id: 'a2', name: 'A very long account name that should still render fine', address: 'g1abcdefghij0123456789xyzw', sourceLabel: 'Private key', selected: false },
  ],
  adding: false,
  onSelect: jest.fn(),
  onOpenAccountSettings: jest.fn(),
  onAddAccount: jest.fn(),
  onImportMnemonic: jest.fn(),
  onImportPrivateKey: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('AccountsPage', () => {
  it('opens settings for the selected account and selects the others', async () => {
    const page = props();

    await renderPage(<AccountsPage {...page} />);

    expect(screen.getByText('2 accounts')).toBeTruthy();
    expect(screen.getByText('g1jg8mtutu…sqf5 · Recovery phrase')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('account-a1'));
    await fireEvent.press(screen.getByTestId('account-a2'));
    await fireEvent.press(screen.getByRole('button', { name: 'Add account' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Import recovery phrase' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Import private key' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onOpenAccountSettings).toHaveBeenCalledWith('a1');
    expect(page.onSelect).toHaveBeenCalledWith('a2');
    expect(page.onSelect).toHaveBeenCalledTimes(1);
    expect(page.onAddAccount).toHaveBeenCalledTimes(1);
    expect(page.onImportMnemonic).toHaveBeenCalledTimes(1);
    expect(page.onImportPrivateKey).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('blocks adding while an account is being created and handles an empty list', async () => {
    const page = props({ accounts: [], adding: true });

    await renderPage(<AccountsPage {...page} />);

    expect(screen.getByText('0 accounts')).toBeTruthy();
    expect(screen.getByText('Adding…')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('accounts-add'));
    expect(page.onAddAccount).not.toHaveBeenCalled();
  });
});
