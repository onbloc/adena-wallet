import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { BackupPasswordPage } from './backup-password';

const meta = {
  title: 'Pages/Onboarding/BackupPassword',
  component: BackupPasswordPage,
  parameters: { layout: 'fullscreen' },
  args: {
    providerName: 'iCloud',
    password: '',
    confirmPassword: '',
    onChangePassword: fn(),
    onChangeConfirmPassword: fn(),
    onSubmit: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof BackupPasswordPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Strong: Story = { args: { password: 'correct horse battery staple', strength: { label: 'Strong password', color: 'success' } } };
