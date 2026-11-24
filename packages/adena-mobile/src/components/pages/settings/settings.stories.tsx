import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { SAMPLE_ADDRESS } from '../../../stories/fixtures';
import { SettingsPage } from './settings';

const meta = {
  title: 'Pages/Settings',
  component: SettingsPage,
  parameters: { layout: 'fullscreen' },
  args: {
    account: { name: 'Account 1', address: SAMPLE_ADDRESS },
    onOpenAccount: fn(),
    networkName: 'Mainnet',
    connectedAppCount: 2,
    themeOptions: [
      { value: 'system', title: 'Auto', description: 'Adapts to your device’s settings.', icon: 'themeAuto' },
      { value: 'light', title: 'Light', description: 'Always use light theme.', icon: 'sun' },
      { value: 'dark', title: 'Dark', description: 'Always use dark theme.', icon: 'moon' },
    ],
    theme: 'system',
    onSelectTheme: fn(),
    currencyOptions: [{ value: 'USD', title: 'United States Dollar', code: 'USD' }],
    currency: 'USD',
    onSelectCurrency: fn(),
    languageOptions: [{ value: 'en', title: 'English' }],
    language: 'en',
    onSelectLanguage: fn(),
    hideSmallBalances: true,
    onToggleHideSmallBalances: fn(),
    hideUnknownTokens: true,
    onToggleHideUnknownTokens: fn(),
    hapticsEnabled: true,
    onToggleHaptics: fn(),
    appVersion: '1.0.0',
    onOpenNetworks: fn(),
    onOpenConnectedApps: fn(),
    onOpenAddressBook: fn(),
    onOpenRecoveryPhrase: fn(),
    onOpenChangePassword: fn(),
    onLock: fn(),
    onOpenReset: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof SettingsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DarkThemeFiltersOff: Story = { args: { theme: 'dark', hideSmallBalances: false, hideUnknownTokens: false, hapticsEnabled: false } };

export const WithoutAccount: Story = { args: { account: undefined } };
