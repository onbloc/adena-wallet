import TransferSummaryBalance, { type TransferSummaryBalanceProps } from './transfer-summary-balance';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/transfer/TransferSummaryBalance',
  component: TransferSummaryBalance,
} as Meta<typeof TransferSummaryBalance>;

export const Default: StoryObj<TransferSummaryBalanceProps> = {
  args: {
    tokenImage: 'https://raw.githubusercontent.com/onbloc/adena-resource/main/images/tokens/gnot.svg',
    transferBalance: '4,000 GNOT'
  },
};