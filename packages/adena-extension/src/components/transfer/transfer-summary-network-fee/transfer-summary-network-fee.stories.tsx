import TransferSummaryNetworkFee, { type TransferSummaryNetworkFeeProps } from './transfer-summary-network-fee';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/transfer/TransferSummaryNetworkFee',
  component: TransferSummaryNetworkFee,
} as Meta<typeof TransferSummaryNetworkFee>;

export const Default: StoryObj<TransferSummaryNetworkFeeProps> = {
  args: {
    value: '0.0048',
    denom: 'GNOT'
  },
};