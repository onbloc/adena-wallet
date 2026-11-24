import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Badge } from './badge';

const meta = {
  title: 'Atoms/Badge',
  component: Badge,
  args: { label: 'Gno.land Mainnet' },
  argTypes: { tone: { control: 'select', options: ['neutral', 'info', 'success', 'warning', 'error'] } },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Success: Story = { args: { tone: 'success', label: 'Confirmed' } };

export const Warning: Story = { args: { tone: 'warning', label: 'Onyx Testnet' } };

export const Error: Story = { args: { tone: 'error', label: 'Failed' } };
