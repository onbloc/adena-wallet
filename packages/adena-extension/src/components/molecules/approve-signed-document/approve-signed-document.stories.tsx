import { ApproveSignedDocument, type ApproveSignedDocumentProps } from '.';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/approve/ApproveTransaction',
  component: ApproveSignedDocument,
} as Meta<typeof ApproveSignedDocument>;

export const Default: StoryObj<ApproveSignedDocumentProps> = {
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
