import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { CardDetailPage } from './card-detail';

const card = {
  name: 'GNOT sender',
  initial: 'G',
  kindLabel: 'Card on this phone',
  expired: false,
  address: 'g1sessioncardaddress000000000000000000000',
  usedAmount: '0.3',
  limitLabel: '/ 2 GNOT',
  periodLabel: 'Today',
  ratio: 0.15,
  usageCaption: 'Resets in 20 hours',
  whereLabel: 'Send GNOT to any address',
  whereTile: 'Send GNOT',
  limitTile: '2 GNOT',
  limitCaption: 'Every day',
  untilTile: '6 days left',
  untilCaption: '2026-12-03 10:00',
  where: ['Send GNOT to any address'],
  restrictions: ['Create or revoke cards', 'Deploy code', 'Run scripts'],
  issuedElsewhere: false,
};

const meta = {
  title: 'Pages/CardDetail',
  component: CardDetailPage,
  parameters: { layout: 'fullscreen' },
  args: {
    card,
    tasks: [
      { id: '1', title: '0.5 GNOT to g1ab…cdef', statusLabel: 'In 12s', tone: 'neutral' as const },
      { id: '2', title: '0.1 GNOT to g1ab…cdef', statusLabel: 'Sent', tone: 'success' as const },
    ],
    loading: false,
    missing: false,
    onBack: fn(),
    onCopyAddress: fn(),
    onRevoke: fn(),
    preparingRevoke: false,
    revoke: { confirming: false, onConfirm: fn(), onClose: fn() },
  },
} satisfies Meta<typeof CardDetailPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Active: Story = {};

export const IssuedElsewhere: Story = { args: { card: { ...card, issuedElsewhere: true, expired: true }, tasks: [] } };

export const Loading: Story = { args: { loading: true } };

export const Ended: Story = { args: { card: undefined, missing: true } };
