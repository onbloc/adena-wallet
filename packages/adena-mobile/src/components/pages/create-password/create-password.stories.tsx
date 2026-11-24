import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { CreatePasswordPage } from './create-password';

const meta = {
  title: 'Pages/CreatePassword',
  component: CreatePasswordPage,
  parameters: { layout: 'fullscreen' },
  args: {
    password: '',
    confirmPassword: '',
    onChangePassword: fn(),
    onChangeConfirmPassword: fn(),
    submitting: false,
    onSubmit: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof CreatePasswordPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Errors: Story = {
  args: { password: 'short', confirmPassword: 'other', passwordError: 'Use at least 8 characters.', confirmError: 'Passwords do not match.' },
};

export const MediumStrength: Story = { args: { password: 'adena2026', strength: { label: 'Medium', color: 'warning' } } };

export const StrongStrength: Story = { args: { password: 'correct horse battery', strength: { label: 'Strong', color: 'success' } } };

export const TooSimple: Story = { args: { password: '12345678', passwordError: 'Password is too simple.' } };
