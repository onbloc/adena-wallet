import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { CardDetailPage } from './card-detail';

const card = {
  name: 'Trading bot',
  expired: false,
  address: 'g1sessioncardaddress000000000000000000000',
  usedLabel: '0.3 GNOT',
  limitLabel: '2 GNOT',
  ratio: 0.15,
  usageCaption: 'Resets in 20 hours',
  where: ['gno.land/r/gnoswap/router'],
  limitRow: '2 GNOT · Every day, network fees included',
  untilRow: '2026-12-03 10:00 · 6 days left',
  restrictions: ['Create or revoke cards', 'Deploy code', 'Run scripts', 'Send GNOT'],
  issuedElsewhere: false,
};

const meta = {
  title: 'Pages/CardDetail',
  component: CardDetailPage,
  parameters: { layout: 'fullscreen' },
  args: {
    card,
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

export const IssuedElsewhere: Story = { args: { card: { ...card, issuedElsewhere: true, expired: true } } };

export const Loading: Story = { args: { loading: true } };

export const Ended: Story = { args: { card: undefined, missing: true } };
