import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { AccountSettingsPage, AccountSettingsPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const address = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const props = (overrides: Partial<AccountSettingsPageProps> = {}): AccountSettingsPageProps => ({
  name: 'Account 1',
  address,
  sourceLabel: 'Recovery phrase',
  onEditProfile: jest.fn(),
  connectedAppCount: 2,
  hasRecoveryPhrase: true,
  canRemove: true,
  onCopyAddress: jest.fn(),
  onOpenConnectedApps: jest.fn(),
  onOpenRecoveryPhrase: jest.fn(),
  onRequestRemove: jest.fn(),
  removeSheet: { visible: true, password: 'pw', onChangePassword: jest.fn(), submitting: false, onConfirm: jest.fn(), onClose: jest.fn() },
  onBack: jest.fn(),
  ...overrides,
});

describe('AccountSettingsPage', () => {
  it('renders the account and reports every action', async () => {
    const page = props();

    await renderPage(<AccountSettingsPage {...page} />);

    expect(screen.getByText('g1jg8m...fvsqf5')).toBeTruthy();
    expect(screen.getAllByText('Recovery phrase')).toHaveLength(2);
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Copy address' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Edit profile' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Manage connections, 2' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Recovery phrase' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove account' }));
    await fireEvent.changeText(screen.getByLabelText('Password'), 'secret');
    await fireEvent.press(screen.getByRole('button', { name: 'Remove' }));

    expect(page.onBack).toHaveBeenCalledTimes(1);
    expect(page.onCopyAddress).toHaveBeenCalledTimes(1);
    expect(page.onEditProfile).toHaveBeenCalledTimes(1);
    expect(page.onOpenConnectedApps).toHaveBeenCalledTimes(1);
    expect(page.onOpenRecoveryPhrase).toHaveBeenCalledTimes(1);
    expect(page.onRequestRemove).toHaveBeenCalledTimes(1);
    expect(page.removeSheet.onChangePassword).toHaveBeenCalledWith('secret');
    expect(page.removeSheet.onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Remove account?')).toBeTruthy();
  });

  it('hides optional rows', async () => {
    const page = props({ hasRecoveryPhrase: false, canRemove: false });

    await renderPage(<AccountSettingsPage {...page} />);

    expect(screen.queryByRole('button', { name: 'Recovery phrase' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove account' })).toBeNull();
  });
});
