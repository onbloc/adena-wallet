import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { AddressBookPage, AddressBookPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<AddressBookPageProps> = {}): AddressBookPageProps => ({
  entries: [{ id: 'e1', name: 'Alice', address: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5' }],
  onAdd: jest.fn(),
  onEdit: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('AddressBookPage', () => {
  it('lists entries and reports actions', async () => {
    const page = props();

    await renderPage(<AddressBookPage {...page} />);

    expect(screen.queryByText('No saved addresses')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /^Alice/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add address' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onEdit).toHaveBeenCalledWith('e1');
    expect(page.onAdd).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state', async () => {
    await renderPage(<AddressBookPage {...props({ entries: [] })} />);

    expect(screen.getByText('No saved addresses')).toBeTruthy();
    expect(screen.getByText('Save addresses you send to often.')).toBeTruthy();
  });
});
