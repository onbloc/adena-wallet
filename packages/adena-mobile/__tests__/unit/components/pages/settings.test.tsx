import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { SettingsPage, SettingsPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<SettingsPageProps> = {}): SettingsPageProps => ({
  account: { name: 'Account 1', address: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5' },
  onOpenAccount: jest.fn(),
  networkName: 'Mainnet',
  connectedAppCount: 0,
  themeOptions: [
    { value: 'system', title: 'Auto', description: 'Adapts to your device’s settings.' },
    { value: 'light', title: 'Light', description: 'Always use light theme.' },
    { value: 'dark', title: 'Dark', description: 'Always use dark theme.' },
  ],
  theme: 'system',
  onSelectTheme: jest.fn(),
  currencyOptions: [{ value: 'USD', title: 'United States Dollar', code: 'USD' }],
  currency: 'USD',
  onSelectCurrency: jest.fn(),
  languageOptions: [{ value: 'en', title: 'English' }],
  language: 'en',
  onSelectLanguage: jest.fn(),
  hideSmallBalances: true,
  onToggleHideSmallBalances: jest.fn(),
  hideUnknownTokens: true,
  onToggleHideUnknownTokens: jest.fn(),
  hapticsEnabled: true,
  onToggleHaptics: jest.fn(),
  appVersion: '1.0.0',
  onOpenNetworks: jest.fn(),
  onOpenConnectedApps: jest.fn(),
  onOpenAddressBook: jest.fn(),
  onOpenRecoveryPhrase: jest.fn(),
  onOpenChangePassword: jest.fn(),
  onLock: jest.fn(),
  onOpenReset: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

const ORDER = [
  'Account 1',
  'Manage', 'Networks', 'Connected apps', 'Address book',
  'General', 'Theme', 'Local currency', 'Language', 'Balances and activity', 'Haptic touch',
  'Privacy and security', 'Change password', 'Recovery phrase', 'Lock wallet', 'Reset wallet',
];

describe('SettingsPage', () => {
  it('renders the account header, sections and rows in order', async () => {
    await renderPage(<SettingsPage {...props()} />);

    const pattern = new RegExp(`^(${ORDER.join('|')})$`);

    expect(screen.getAllByText(pattern).map(node => node.props.children)).toEqual(ORDER);
    expect(screen.getByText('g1jg8m...fvsqf5')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Theme, Auto' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Local currency, USD' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Language, English' })).toBeTruthy();
  });

  it('has no notifications, advanced, accounts or placeholder rows', async () => {
    await renderPage(<SettingsPage {...props()} />);

    ['Notifications', 'Advanced', 'Accounts', 'Hide reported activity'].forEach(label => expect(screen.queryByText(label)).toBeNull());
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });

  it('reports every navigation action', async () => {
    const page = props();

    await renderPage(<SettingsPage {...page} />);

    expect(screen.getByText('Version 1.0.0')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Account 1, g1jg8m...fvsqf5' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Networks, Mainnet' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Connected apps, 0' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Address book' }));
    await fireEvent.press(screen.getByRole('switch', { name: 'Haptic touch' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Change password' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Recovery phrase' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Lock wallet' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Reset wallet' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onOpenAccount).toHaveBeenCalledTimes(1);
    expect(page.onOpenNetworks).toHaveBeenCalledTimes(1);
    expect(page.onOpenConnectedApps).toHaveBeenCalledTimes(1);
    expect(page.onOpenAddressBook).toHaveBeenCalledTimes(1);
    expect(page.onToggleHaptics).toHaveBeenCalledWith(false);
    expect(page.onOpenChangePassword).toHaveBeenCalledTimes(1);
    expect(page.onOpenRecoveryPhrase).toHaveBeenCalledTimes(1);
    expect(page.onLock).toHaveBeenCalledTimes(1);
    expect(page.onOpenReset).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('opens the theme sheet with three options and reports the pick', async () => {
    const page = props();

    await renderPage(<SettingsPage {...page} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Theme, Auto' }));

    const options = screen.getAllByRole('radio');

    expect(options.map(node => node.props.accessibilityLabel)).toEqual([
      'Auto, Adapts to your device’s settings.',
      'Light, Always use light theme.',
      'Dark, Always use dark theme.',
    ]);
    expect(options.map(node => node.props.accessibilityState.selected)).toEqual([true, false, false]);
    await fireEvent.press(options[2]);
    expect(page.onSelectTheme).toHaveBeenCalledWith('dark');
  });

  it('lists only the supported currency', async () => {
    const page = props();

    await renderPage(<SettingsPage {...page} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Local currency, USD' }));
    expect(screen.getAllByRole('radio').map(node => node.props.accessibilityLabel)).toEqual(['United States Dollar, USD']);
    expect(screen.getByRole('radio', { name: 'United States Dollar, USD' }).props.accessibilityState.selected).toBe(true);
    await fireEvent.press(screen.getByRole('radio', { name: 'United States Dollar, USD' }));
    expect(page.onSelectCurrency).toHaveBeenCalledWith('USD');
  });

  it('lists only the supported language', async () => {
    const page = props();

    await renderPage(<SettingsPage {...page} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Language, English' }));
    expect(screen.getAllByRole('radio').map(node => node.props.accessibilityLabel)).toEqual(['English']);
    await fireEvent.press(screen.getByRole('radio', { name: 'English' }));
    expect(page.onSelectLanguage).toHaveBeenCalledWith('en');
  });

  it('toggles the balance filters from the balances sheet', async () => {
    const page = props();

    await renderPage(<SettingsPage {...page} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Balances and activity' }));

    expect(screen.getByText('Balances under 1 USD will be hidden from your portfolio.')).toBeTruthy();
    expect(screen.getByText('Potential scam tokens will be hidden from your portfolio.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('switch', { name: 'Hide small balances' }));
    await fireEvent.press(screen.getByRole('switch', { name: 'Hide unknown tokens' }));

    expect(page.onToggleHideSmallBalances).toHaveBeenCalledWith(false);
    expect(page.onToggleHideUnknownTokens).toHaveBeenCalledWith(false);
  });

  it('has no biometric switch; biometrics are set on the change password page', async () => {
    await renderPage(<SettingsPage {...props()} />);

    expect(screen.getAllByRole('switch').map(item => item.props.accessibilityLabel)).toEqual(['Haptic touch']);
  });

  it('shows the cloud backup row only when available', async () => {
    await renderPage(<SettingsPage {...props()} />);
    expect(screen.queryByText('iCloud backup')).toBeNull();

    const onOpenCloudBackup = jest.fn();

    await renderPage(<SettingsPage {...props({ cloudBackupLabel: 'iCloud backup', cloudBackupValue: 'Out of date', onOpenCloudBackup })} />);
    await fireEvent.press(screen.getByRole('button', { name: 'iCloud backup, Out of date' }));
    expect(onOpenCloudBackup).toHaveBeenCalledTimes(1);
  });
});
