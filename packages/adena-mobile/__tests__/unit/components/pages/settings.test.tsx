import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { SettingsPage, SettingsPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<SettingsPageProps> = {}): SettingsPageProps => ({
  networkName: 'Mainnet',
  accountCount: 3,
  connectedAppCount: 0,
  hapticsEnabled: true,
  onToggleHaptics: jest.fn(),
  appVersion: '1.0.0',
  onOpenNetworks: jest.fn(),
  onOpenAccounts: jest.fn(),
  onOpenConnectedApps: jest.fn(),
  onOpenRecoveryPhrase: jest.fn(),
  onOpenChangePassword: jest.fn(),
  onLock: jest.fn(),
  onOpenAddressBook: jest.fn(),
  onOpenReset: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('SettingsPage', () => {
  it('reports every setting action', async () => {
    const page = props();

    await renderPage(<SettingsPage {...page} />);

    expect(screen.getByText('Version 1.0.0')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Network, Mainnet' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Accounts, 3' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Connected apps, 0' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Address book' }));
    await fireEvent.press(screen.getByRole('switch', { name: 'Haptic touch' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Change password' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Recovery phrase' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Lock wallet' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Reset wallet' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onOpenNetworks).toHaveBeenCalledTimes(1);
    expect(page.onOpenAccounts).toHaveBeenCalledTimes(1);
    expect(page.onOpenConnectedApps).toHaveBeenCalledTimes(1);
    expect(page.onOpenAddressBook).toHaveBeenCalledTimes(1);
    expect(page.onToggleHaptics).toHaveBeenCalledWith(false);
    expect(page.onOpenChangePassword).toHaveBeenCalledTimes(1);
    expect(page.onOpenRecoveryPhrase).toHaveBeenCalledTimes(1);
    expect(page.onLock).toHaveBeenCalledTimes(1);
    expect(page.onOpenReset).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('has no biometric switch; biometrics are set on the change password page', async () => {
    await renderPage(<SettingsPage {...props()} />);

    expect(screen.getAllByRole('switch').map(item => item.props.accessibilityLabel)).toEqual(['Haptic touch']);
  });
});
