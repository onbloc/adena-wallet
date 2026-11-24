import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { ChangePasswordPage } from './change-password';

const meta = {
  title: 'Pages/ChangePassword',
  component: ChangePasswordPage,
  parameters: { layout: 'fullscreen' },
  args: {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    onChangeCurrentPassword: fn(),
    onChangeNewPassword: fn(),
    onChangeConfirmPassword: fn(),
    biometricEnabled: false,
    onToggleBiometric: fn(),
    submitting: false,
    onSubmit: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof ChangePasswordPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithBiometrics: Story = { args: { biometricLabel: 'Face ID', biometricEnabled: true } };

export const StrongStrength: Story = {
  args: { currentPassword: 'current password', newPassword: 'correct horse battery', strength: { label: 'Strong', color: 'success' } },
};

export const Errors: Story = {
  args: {
    currentPassword: 'wrong password',
    newPassword: 'short',
    confirmPassword: 'other',
    currentError: 'Incorrect password.',
    newError: 'Password must be 8~256 characters',
    confirmError: 'Passwords do not match',
  },
};

export const Submitting: Story = {
  args: { currentPassword: 'current password', newPassword: 'correct horse battery', confirmPassword: 'correct horse battery', submitting: true },
};
