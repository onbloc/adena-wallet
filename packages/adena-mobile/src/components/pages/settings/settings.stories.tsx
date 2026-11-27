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
      { value: 'system', title: 'Auto', description: 'Adapts to your device’s settings.' },
      { value: 'light', title: 'Light', description: 'Always use light theme.' },
      { value: 'dark', title: 'Dark', description: 'Always use dark theme.' },
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

export const WithNotifications: Story = {
  args: {
    notifications: {
      enabled: true,
      topics: [
        { topic: 'received', title: 'Received', description: 'When tokens arrive in one of your accounts.', value: true },
        { topic: 'sent', title: 'Sent', description: 'When a transfer you sent is confirmed on-chain.', value: true },
        { topic: 'swap', title: 'Swaps', description: 'When a swap you made is confirmed on-chain.', value: false },
      ],
      onToggleEnabled: fn(),
      onToggleTopic: fn(),
    },
  },
};
