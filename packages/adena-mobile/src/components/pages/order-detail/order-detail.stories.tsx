import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { OrderDetailPage } from './order-detail';

const order = {
  row: {
    id: 'dca:7',
    kind: 'dca' as const,
    title: 'Buy GNS',
    subtitle: 'Recurring buy · 50 GNOT every week',
    progress: 0.3,
    segments: { total: 10, done: 3 },
    pillLabel: '3 of 10',
    footerLeft: '350 GNOT left',
    footerRight: '36.6 GNS to claim',
    claimable: true,
  },
  tiles: [
    { icon: 'repeat' as const, label: 'Each buy', value: '50 GNOT', caption: 'Every week' },
    { icon: 'wallet' as const, label: 'In escrow', value: '350 GNOT', caption: 'of 500 GNOT' },
    { icon: 'arrowUp' as const, label: 'To claim', value: '36.6 GNS' },
  ],
  rows: [],
  notes: ['GnoSwap keepers run each buy on schedule. A missed slot is skipped, not doubled up.'],
  canClaim: true,
  cancelDescription: 'Cancelling claims what was bought and returns 350 GNOT.',
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
