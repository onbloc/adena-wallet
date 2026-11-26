import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { OrderCreatePage } from './order-create';

const meta = {
  title: 'Pages/OrderCreate',
  component: OrderCreatePage,
  parameters: { layout: 'fullscreen' },
  args: {
    kind: 'dca',
    onBack: fn(),
    inputLabel: 'GNOT',
    inputBalanceLabel: '1,600 GNOT',
    outputLabel: 'GNS',
    onPickInput: fn(),
    onPickOutput: fn(),
    tokenSheet: { visible: false, title: 'Buy', options: [], onSelect: fn(), onClose: fn() },
    checkingRules: false,
    amount: '50',
    amountLabel: 'Each buy (GNOT)',
    onChangeAmount: fn(),
    count: '10',
    onChangeCount: fn(),
    intervals: [
      { key: 86400, label: 'Every day', selected: false },
      { key: 604800, label: 'Every week', selected: true },
    ],
    onSelectInterval: fn(),
    summary: [{ label: 'Total set aside', value: '500 GNOT' }, { label: 'Runs for', value: '70 days' }],
    canReview: true,
    preparing: false,
    onReview: fn(),
    review: { confirming: false, onConfirm: fn(), onClose: fn() },
  },
} satisfies Meta<typeof OrderCreatePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RecurringBuy: Story = {};

export const LimitOrder: Story = {
  args: {
    kind: 'limit',
    inputLabel: 'GNS',
    outputLabel: 'GNOT',
    amountLabel: 'Sell amount (GNS)',
    price: '0.25',
    priceLabel: 'Price (GNOT per GNS)',
    onChangePrice: fn(),
    marketPriceLabel: '0.2412',
    onUseMarketPrice: fn(),
    slippages: [{ key: 0, label: '0%', selected: true }, { key: 50, label: '0.5%', selected: false }],
    onSelectSlippage: fn(),
    durations: [{ key: 86400, label: '1 day', selected: false }, { key: 604800, label: '7 days', selected: true }],
    onSelectDuration: fn(),
    summary: [{ label: 'You get at least', value: '25 GNOT' }],
  },
};

export const UnsupportedPair: Story = { args: { rulesNotice: 'GnoSwap does not run recurring buys for this pair yet.', canReview: false } };
