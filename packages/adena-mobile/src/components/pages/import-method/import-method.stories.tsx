import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { ImportMethodPage } from './import-method';

const meta = {
  title: 'Pages/Onboarding/ImportMethod',
  component: ImportMethodPage,
  parameters: { layout: 'fullscreen' },
  args: { onRecoveryPhrase: fn(), cloudProviderName: 'iCloud', onCloudBackup: fn(), onBack: fn() },
} satisfies Meta<typeof ImportMethodPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PhraseOnly: Story = { args: { cloudProviderName: undefined } };
