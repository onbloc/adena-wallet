import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { CloudBackupPage } from './cloud-backup';

const meta = {
  title: 'Pages/CloudBackup',
  component: CloudBackupPage,
  parameters: { layout: 'fullscreen' },
  args: {
    providerName: 'iCloud',
    state: { kind: 'none' },
    onBackUp: fn(),
    onRetry: fn(),
    onDelete: fn(),
    deleteDialogVisible: false,
    deleting: false,
    onConfirmDelete: fn(),
    onCancelDelete: fn(),
    walletPasswordSheet: { visible: false, password: '', onChangePassword: fn(), submitting: false, onConfirm: fn(), onClose: fn() },
    onBack: fn(),
  },
} satisfies Meta<typeof CloudBackupPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NotBackedUp: Story = {};

export const Ready: Story = {
  args: { state: { kind: 'backedUp', backedUpAt: '2026-11-24 09:05', outdated: false, items: ['Recovery phrase'] } },
};

export const Outdated: Story = {
  args: { state: { kind: 'backedUp', backedUpAt: '2026-11-24 09:05', outdated: true, items: ['Recovery phrase', 'Private key'] } },
};

export const BackupPassword: Story = {
  args: {
    backupForm: {
      password: 'violet orbit lantern 42',
      confirmPassword: '',
      onChangePassword: fn(),
      onChangeConfirmPassword: fn(),
      strength: { label: 'Strong', color: 'success' },
      submitting: false,
      onSubmit: fn(),
    },
  },
};

export const GoogleDriveSignedOut: Story = {
  args: { providerName: 'Google Drive', state: { kind: 'error', title: 'Not signed in to Google Drive', description: 'Allow Adena to use Google Drive to continue.' } },
};
