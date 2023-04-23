import TransferSummaryAddress, { type TransferSummaryAddressProps } from './transfer-summary-address';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/transfer/TransferSummaryAddress',
  component: TransferSummaryAddress,
} as Meta<typeof TransferSummaryAddress>;

export const Default: StoryObj<TransferSummaryAddressProps> = {
  args: {
    toAddress: 'g1fnakf9vrd6uqn8qdmp88yac4p0ngy572answ9f'
  },
};