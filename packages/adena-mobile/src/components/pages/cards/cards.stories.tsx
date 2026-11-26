import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { CardsPage } from './cards';

const cards = [
  {
    id: 'g1card1',
    name: 'Order manager',
    initial: 'O',
    kindLabel: 'Card on this phone',
    whereLabel: 'gno.land/r/gnoswap/order/dca +1',
    usedAmount: '0.3',
    limitLabel: '/ 2 GNOT',
    periodLabel: 'This week',
    ratio: 0.15,
    timeLeftLabel: '42 minutes',
    expired: false,
  },
];

const orders = [
  {
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
  {
    id: 'limit:3',
    kind: 'limit' as const,
    title: 'Sell GNS',
    subtitle: 'Limit order · 0.25 GNOT per GNS',
    progress: 0.4,
    pillLabel: '40% filled',
    footerLeft: '60 GNS left',
    footerRight: '6 days left',
    claimable: false,
  },
];

const meta = {
  title: 'Pages/Cards',
  component: CardsPage,
  parameters: { layout: 'fullscreen' },
  args: {
    supported: true,
    loading: false,
    cards,
    refreshing: false,
    onRefresh: fn(),
    onCreate: fn(),
    onOpenCard: fn(),
    onRevokeCard: fn(),
    onRevokeAll: fn(),
    revoke: { confirming: false, onConfirm: fn(), onClose: fn() },
    ordersSupported: true,
    ordersLoading: false,
    orders,
    onOpenOrder: fn(),
    chooserVisible: false,
    onOpenChooser: fn(),
    onCloseChooser: fn(),
    onCreateDca: fn(),
    onCreateLimit: fn(),
  },
} satisfies Meta<typeof CardsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Working: Story = {};

export const Empty: Story = { args: { cards: [], orders: [] } };

export const Loading: Story = { args: { loading: true } };

export const Unsupported: Story = { args: { supported: false } };

export const NearLimit: Story = { args: { notice: '14 of 16 cards in use. Revoke cards you no longer need.' } };

export const Chooser: Story = { args: { chooserVisible: true } };

export const RevokeReview: Story = {
  args: {
    revoke: {
      review: {
        title: 'Revoke card',
        subtitle: 'Order manager',
        facts: [{ icon: 'card', label: 'Card address', value: 'g1card1' }],
        warnings: [{ title: 'This cannot be undone' }],
        fee: {
          options: [{ tier: 'AVERAGE', label: 'Average', feeLabel: '0.010554 GNOT' }],
          selected: 'AVERAGE',
          onSelect: fn(),
          customAdjustment: '1.5',
          onChangeCustomAdjustment: fn(),
          tooLow: false,
        },
        confirmLabel: 'Hold to revoke',
        destructive: true,
      },
      confirming: false,
      onConfirm: fn(),
      onClose: fn(),
    },
  },
};
