import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { CardsPage } from './cards';

const cards = [
  {
    id: 'g1card1',
    name: 'Trading bot',
    whereLabel: 'gno.land/r/gnoswap/router',
    usedLabel: '0.3 GNOT',
    limitLabel: '2 GNOT',
    ratio: 0.15,
    timeLeftLabel: '6 days left',
    expired: false,
  },
  {
    id: 'g1card2',
    name: 'Claude Code',
    whereLabel: 'gno.land/r/gnoswap/order +1',
    usedLabel: '2 GNOT',
    limitLabel: '2 GNOT',
    ratio: 1,
    timeLeftLabel: 'Expired',
    expired: true,
  },
];

const orders = [
  {
    id: 'dca:7',
    kind: 'dca' as const,
    title: 'Buy GNS with GNOT',
    subtitle: '50 GNOT · Every week',
    progress: 0.3,
    progressLabel: '3 of 10 buys',
    statusLabel: 'Next in 2 days',
    claimLabel: '36.6 GNS to claim',
  },
  {
    id: 'limit:3',
    kind: 'limit' as const,
    title: 'Sell GNS for GNOT',
    subtitle: '0.25 GNOT per GNS',
    progress: 0.4,
    progressLabel: '40% filled',
    statusLabel: '6 days left',
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
    onRevokeAll: fn(),
    preparingRevokeAll: false,
    revokeAll: { confirming: false, onConfirm: fn(), onClose: fn() },
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

export const WithCards: Story = {};

export const Empty: Story = { args: { cards: [] } };

export const Loading: Story = { args: { loading: true } };

export const Unsupported: Story = { args: { supported: false } };

export const NearLimit: Story = { args: { notice: '14 of 16 cards in use. Revoke cards you no longer need.' } };

export const NoOrders: Story = { args: { orders: [] } };

export const Chooser: Story = { args: { chooserVisible: true } };
