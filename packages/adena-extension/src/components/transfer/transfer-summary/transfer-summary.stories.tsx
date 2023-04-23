import React from 'react';
import TransferSummary, { type TransferSummaryProps } from './transfer-summary';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/transfer/TransferSummary',
  component: TransferSummary,
} as Meta<typeof TransferSummary>;

export const Default: StoryObj<TransferSummaryProps> = {
  args: {
    tokenImage: 'https://raw.githubusercontent.com/onbloc/adena-resource/main/images/tokens/gnot.svg',
    transferBalance: '4,000 GNOT',
    toAddress: 'g1fnakf9vrd6uqn8qdmp88yac4p0ngy572answ9f',
    networkFee: {
      value: '0.0048',
      denom: 'GNOT'
    },
    onClickCancel: action('click cancel'),
    onClickSend: action('click send'),
  },
  render: (args) => (
    <div style={{ height: '500px' }}>
      <TransferSummary {...args} />
    </div>
  )
};