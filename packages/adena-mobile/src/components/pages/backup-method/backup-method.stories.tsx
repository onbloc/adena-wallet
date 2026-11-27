import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { BackupMethodPage } from './backup-method';

const meta = {
  title: 'Pages/Onboarding/BackupMethod',
  component: BackupMethodPage,
  parameters: { layout: 'fullscreen' },
  args: { cloudProviderName: 'iCloud', onCloudBackup: fn(), onManualBackup: fn(), onBackUpLater: fn(), onBack: fn() },
} satisfies Meta<typeof BackupMethodPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ManualOnly: Story = { args: { cloudProviderName: undefined } };
