import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { SpendMeter } from './spend-meter';

const meta = {
  title: 'Molecules/SpendMeter',
  component: SpendMeter,
  args: { ratio: 0.15, usedLabel: '0.3 GNOT', limitLabel: '2 GNOT', caption: 'Resets in 3 days' },
} satisfies Meta<typeof SpendMeter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Partial: Story = {};

export const Full: Story = { args: { ratio: 1, usedLabel: '2 GNOT', caption: undefined } };
