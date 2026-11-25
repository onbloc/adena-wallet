import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { UnlockPage } from './unlock';

const meta = {
  title: 'Pages/Unlock',
  component: UnlockPage,
  parameters: { layout: 'fullscreen' },
  args: { password: '', onChangePassword: fn(), submitting: false, onUnlock: fn(), onResetWallet: fn() },
} satisfies Meta<typeof UnlockPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithBiometrics: Story = { args: { biometricLabel: 'Face ID', onBiometricUnlock: fn() } };

export const WrongPassword: Story = { args: { password: 'wrong password', error: 'Incorrect password.' } };

export const Throttled: Story = { args: { password: 'correct horse battery', error: 'Too many attempts. Try again in 30 seconds.' } };

export const Submitting: Story = { args: { password: 'correct horse battery', submitting: true } };
