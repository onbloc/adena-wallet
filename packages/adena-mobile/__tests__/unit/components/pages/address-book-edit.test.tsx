import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { AddressBookEditPage, AddressBookEditPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<AddressBookEditPageProps> = {}): AddressBookEditPageProps => ({
  mode: 'edit',
  name: 'Alice',
  address: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
  onChangeName: jest.fn(),
  onChangeAddress: jest.fn(),
  addressPlaceholder: 'g1…',
  onSave: jest.fn(),
  onRemove: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('AddressBookEditPage', () => {
  it('edits, saves and removes an entry', async () => {
    const page = props();

    await renderPage(<AddressBookEditPage {...page} />);

    expect(screen.getByText('Edit address')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Bob');
    await fireEvent.changeText(screen.getByLabelText('Address'), 'g1new');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove address' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onChangeName).toHaveBeenCalledWith('Bob');
    expect(page.onChangeAddress).toHaveBeenCalledWith('g1new');
    expect(page.onSave).toHaveBeenCalledTimes(1);
    expect(page.onRemove).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('adds without a remove action and shows validation errors', async () => {
    const page = props({ mode: 'add', name: ' ', address: '', onRemove: undefined, nameError: 'Name is taken', addressError: 'Invalid address' });

    await renderPage(<AddressBookEditPage {...page} />);

    expect(screen.getByText('Add address')).toBeTruthy();
    expect(screen.getByText('Name is taken')).toBeTruthy();
    expect(screen.getByText('Invalid address')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Remove address' })).toBeNull();
    await fireEvent.press(screen.getByTestId('address-save'));
    expect(page.onSave).not.toHaveBeenCalled();
  });

  it('disables save when only the address is blank', async () => {
    const page = props({ address: '  ' });

    await renderPage(<AddressBookEditPage {...page} />);
    await fireEvent.press(screen.getByTestId('address-save'));
    expect(page.onSave).not.toHaveBeenCalled();
  });
});
