import TransferLedgerLoading, { type TransferLedgerLoadingProps } from './transfer-ledger-loading';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/transfer/TransferLedgerLoading',
  component: TransferLedgerLoading,
} as Meta<typeof TransferLedgerLoading>;

export const Default: StoryObj<TransferLedgerLoadingProps> = {
  args: {
    onClickCancel: action('click cancel'),
  },
};