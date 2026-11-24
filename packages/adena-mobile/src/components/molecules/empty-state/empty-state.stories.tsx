import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { EmptyState } from './empty-state';

const meta = {
  title: 'Molecules/EmptyState',
  component: EmptyState,
  args: { title: 'No collectibles yet' },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = { args: { description: 'Hidden collections can be shown again.', actionLabel: 'Manage NFTs', onAction: fn() } };
