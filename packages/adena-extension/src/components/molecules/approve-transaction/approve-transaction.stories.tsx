import { ApproveTransaction, type ApproveTransactionProps } from '.';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/approve/ApproveTransaction',
  component: ApproveTransaction,
} as Meta<typeof ApproveTransaction>;

export const Default: StoryObj<ApproveTransactionProps> = {
  args: {
    domain: '',
    loading: true,
    logo: '',
    title: 'Sign Transaction',
    contracts: [
      {
        type: '/vm.m_call',
        function: 'GetBoardIDFromName',
        value: '',
      },
    ],
    networkFee: {
      amount: '0.0048',
      denom: 'GNOT',
    },
    transactionData: '',
    opened: false,
    onToggleTransactionData: action('openTransactionData'),
    onClickConfirm: action('confirm'),
    onClickCancel: action('cancel'),
  },
};
