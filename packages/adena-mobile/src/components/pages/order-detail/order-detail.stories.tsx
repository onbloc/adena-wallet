import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { OrderDetailPage } from './order-detail';

const order = {
  title: 'Buy GNS with GNOT',
  progress: 0.3,
  progressLabel: '3 of 10 buys',
  statusLabel: 'Next in 2 days',
  rows: [
    { label: 'Each buy', value: '50 GNOT' },
    { label: 'How often', value: 'Every week' },
    { label: 'Still in escrow', value: '350 GNOT' },
    { label: 'Ready to claim', value: '36.6 GNS', emphasis: true },
  ],
  notes: ['GnoSwap keepers run each buy on schedule. A missed slot is skipped, not doubled up.'],
  canClaim: true,
  cancelDescription: 'Claims what was bought and returns 350 GNOT.',
};

const meta = {
  title: 'Pages/OrderDetail',
  component: OrderDetailPage,
  parameters: { layout: 'fullscreen' },
  args: {
    order,
    loading: false,
    missing: false,
    onBack: fn(),
    onClaim: fn(),
    onCancel: fn(),
    preparing: false,
    review: { confirming: false, onConfirm: fn(), onClose: fn() },
  },
} satisfies Meta<typeof OrderDetailPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RecurringBuy: Story = {};

export const NothingToClaim: Story = { args: { order: { ...order, canClaim: false } } };

export const Settled: Story = { args: { order: undefined, missing: true } };
