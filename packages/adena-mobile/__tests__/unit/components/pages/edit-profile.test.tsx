import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { EditProfilePage, EditProfilePageProps } from '../../../../src/components/pages';
import { ACCOUNT_NAME_MAX_LENGTH } from '../../../../src/domain/account';
import { renderPage } from './render-page';

const address = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const props = (overrides: Partial<EditProfilePageProps> = {}): EditProfilePageProps => ({
  name: 'Account 1',
  address,
  avatarColor: '#0E7490',
  colorOptions: [{ key: 'ink', label: 'Ink', color: '#121212' }, { key: 'teal', label: 'Teal', color: '#0E7490' }],
  selectedColorKey: 'teal',
  colorSheetVisible: true,
  onOpenColorSheet: jest.fn(),
  onCloseColorSheet: jest.fn(),
  onSelectColor: jest.fn(),
  onChangeName: jest.fn(),
  canSave: true,
  onSave: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('EditProfilePage', () => {
  it('renders the profile and reports edits', async () => {
    const page = props();

    await renderPage(<EditProfilePage {...page} />);

    expect(screen.getByText('g1jg...sqf5')).toBeTruthy();
    expect(screen.getByText('A1')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Teal' }).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByRole('button', { name: 'Change avatar color' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Ink' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    await fireEvent.changeText(screen.getByLabelText('Account name'), 'Main');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onOpenColorSheet).toHaveBeenCalledTimes(1);
    expect(page.onSelectColor).toHaveBeenCalledWith('ink');
    expect(page.onCloseColorSheet).toHaveBeenCalled();
    expect(page.onChangeName).toHaveBeenCalledWith('Main');
    expect(screen.getByLabelText('Account name').props.maxLength).toBe(ACCOUNT_NAME_MAX_LENGTH);
    expect(page.onSave).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows the name error and blocks saving', async () => {
    const page = props({ name: '', nameError: 'Account name is required', canSave: false, colorSheetVisible: false });

    await renderPage(<EditProfilePage {...page} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Account name is required')).toBeTruthy();
    expect(page.onSave).not.toHaveBeenCalled();
  });
});
