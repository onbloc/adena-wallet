import TransferSummaryBalance, { type TransferSummaryBalanceProps } from './transfer-summary-balance';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/transfer/TransferSummaryBalance',
  component: TransferSummaryBalance,
} as Meta<typeof TransferSummaryBalance>;

export const Default: StoryObj<TransferSummaryBalanceProps> = {
  args: {
    tokenImage: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
    value: '4,000.123',
    denom: 'GNOT',
  },
};