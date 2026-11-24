import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { EditProfilePage, EditProfilePageProps } from '../../../../src/components/pages';
import { ACCOUNT_NAME_MAX_LENGTH } from '../../../../src/domain/account';
import { renderPage } from './render-page';

const address = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const PHOTO = 'data:image/jpeg;base64,AAAA';

const props = (overrides: Partial<EditProfilePageProps> = {}): EditProfilePageProps => ({
  name: 'Account 1',
  address,
  avatarColor: 'teal',
  onChangePhoto: jest.fn(),
  photoSheetVisible: false,
  onChoosePhoto: jest.fn(),
  onRemovePhoto: jest.fn(),
  onClosePhotoSheet: jest.fn(),
  onChangeName: jest.fn(),
  canSave: true,
  onSave: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('EditProfilePage', () => {
  it('renders the initials avatar and reports edits', async () => {
    const page = props();

    await renderPage(<EditProfilePage {...page} />);

    expect(screen.getByText('g1jg...sqf5')).toBeTruthy();
    expect(screen.getByText('A1')).toBeTruthy();
    expect(screen.queryByTestId('avatar-photo')).toBeNull();
    expect(screen.queryByText('Shown only on this device.')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Change profile photo' }));
    await fireEvent.changeText(screen.getByLabelText('Account name'), 'Main');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onChangePhoto).toHaveBeenCalledTimes(1);
    expect(page.onChangeName).toHaveBeenCalledWith('Main');
    expect(screen.getByLabelText('Account name').props.maxLength).toBe(ACCOUNT_NAME_MAX_LENGTH);
    expect(page.onSave).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows the photo and its choose/remove options', async () => {
    const page = props({ avatarPhoto: PHOTO, photoSheetVisible: true });

    await renderPage(<EditProfilePage {...page} />);

    expect(screen.getByTestId('avatar-photo').props.source).toEqual({ uri: PHOTO });
    expect(screen.queryByText('A1')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose photo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove photo' }));

    expect(page.onChoosePhoto).toHaveBeenCalledTimes(1);
    expect(page.onRemovePhoto).toHaveBeenCalledTimes(1);
  });

  it('shows the name error and blocks saving', async () => {
    const page = props({ name: '', nameError: 'Account name is required', canSave: false });

    await renderPage(<EditProfilePage {...page} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Account name is required')).toBeTruthy();
    expect(page.onSave).not.toHaveBeenCalled();
  });
});
