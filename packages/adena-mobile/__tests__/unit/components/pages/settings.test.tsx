import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { SettingsPage, SettingsPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<SettingsPageProps> = {}): SettingsPageProps => ({
  networkName: 'Mainnet',
  accountCount: 3,
  connectedAppCount: 0,
  biometricLabel: 'Face ID',
  biometricEnabled: false,
  onToggleBiometric: jest.fn(),
  hapticsEnabled: true,
  onToggleHaptics: jest.fn(),
  appVersion: '1.0.0',
  onOpenNetworks: jest.fn(),
  onOpenAccounts: jest.fn(),
  onOpenConnectedApps: jest.fn(),
  onOpenRecoveryPhrase: jest.fn(),
  onLock: jest.fn(),
  onOpenAddressBook: jest.fn(),
  onOpenReset: jest.fn(),
  passwordSheet: { visible: true, password: '', onChangePassword: jest.fn(), submitting: false, onConfirm: jest.fn(), onClose: jest.fn() },
  onBack: jest.fn(),
  ...overrides,
});

describe('SettingsPage', () => {
  it('reports every setting action', async () => {
    const page = props();

    await renderPage(<SettingsPage {...page} />);

    expect(screen.getByText('Version 1.0.0')).toBeTruthy();
    expect(screen.getByText('Enable Face ID')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Network, Mainnet' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Accounts, 3' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Connected apps, 0' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Address book' }));
    await fireEvent.press(screen.getByRole('switch', { name: 'Haptic touch' }));
    await fireEvent.press(screen.getByRole('switch', { name: 'Face ID' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Recovery phrase' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Lock wallet' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Reset wallet' }));
    await fireEvent.changeText(screen.getByLabelText('Password'), 'secret');
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onOpenNetworks).toHaveBeenCalledTimes(1);
    expect(page.onOpenAccounts).toHaveBeenCalledTimes(1);
    expect(page.onOpenConnectedApps).toHaveBeenCalledTimes(1);
    expect(page.onOpenAddressBook).toHaveBeenCalledTimes(1);
    expect(page.onToggleHaptics).toHaveBeenCalledWith(false);
    expect(page.onToggleBiometric).toHaveBeenCalledWith(true);
    expect(page.onOpenRecoveryPhrase).toHaveBeenCalledTimes(1);
    expect(page.onLock).toHaveBeenCalledTimes(1);
    expect(page.onOpenReset).toHaveBeenCalledTimes(1);
    expect(page.passwordSheet.onChangePassword).toHaveBeenCalledWith('secret');
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('hides the biometric switch when unsupported', async () => {
    await renderPage(<SettingsPage {...props({ biometricLabel: undefined, passwordSheet: { ...props().passwordSheet, visible: true } })} />);

    expect(screen.queryByRole('switch', { name: 'Face ID' })).toBeNull();
    expect(screen.getByText('Enable biometrics')).toBeTruthy();
  });
});
