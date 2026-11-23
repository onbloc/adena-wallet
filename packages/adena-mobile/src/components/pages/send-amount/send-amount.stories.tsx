import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { SAMPLE_RECIPIENT } from '../../../stories/fixtures';
import { SendAmountPage } from './send-amount';

const feeOptions = [
  { tier: 'SLOW' as const, label: 'Slow', feeLabel: '0.009595 GNOT' },
  { tier: 'AVERAGE' as const, label: 'Average', feeLabel: '0.010554 GNOT' },
  { tier: 'FAST' as const, label: 'Fast', feeLabel: '0.011514 GNOT' },
];

const meta = {
  title: 'Pages/SendAmount',
  component: SendAmountPage,
  parameters: { layout: 'fullscreen' },
  args: {
    amount: '1',
    symbol: 'GNOT',
    available: '11,301.850689',
    recipientAddress: SAMPLE_RECIPIENT,
    recipientLabel: '123123123',
    canReview: true,
    preparing: false,
    onKeyPress: fn(),
    onMax: fn(),
    onReview: fn(),
    onBack: fn(),
    confirming: false,
    onConfirm: fn(),
    onCloseReview: fn(),
    memo: '',
    onChangeMemo: fn(),
    memoSheetVisible: false,
    onOpenMemo: fn(),
    onCloseMemo: fn(),
    tokenOptions: [
      { key: 'ugnot', symbol: 'GNOT', name: 'Gno.land', balanceLabel: '11,301.850689 GNOT' },
      { key: 'gno.land/r/gnoswap/gns.GNS', symbol: 'GNS', name: 'Gnoswap', balanceLabel: '49,985,441.056734 GNS' },
    ],
    tokenPickerVisible: false,
    onOpenTokenPicker: fn(),
    onCloseTokenPicker: fn(),
    onSelectToken: fn(),
  },
} satisfies Meta<typeof SendAmountPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Entry: Story = {};

export const Empty: Story = { args: { amount: '', canReview: false } };

export const SimulationError: Story = { args: { symbol: 'GNS', error: 'cannot send transfer to self' } };

export const InsufficientBalance: Story = { args: { amount: '20000', canReview: false, error: 'Insufficient balance' } };

export const Review: Story = {
  args: {
    review: {
      amountLabel: '1 GNOT',
      recipientAddress: SAMPLE_RECIPIENT,
      networkName: 'Gno.land Mainnet',
      totalLabel: '1.010554 GNOT',
      fee: { options: feeOptions, selected: 'AVERAGE', onSelect: fn(), customAdjustment: '1', onChangeCustomAdjustment: fn(), tooLow: false },
    },
  },
};

export const TokenPicker: Story = { args: { tokenPickerVisible: true } };
