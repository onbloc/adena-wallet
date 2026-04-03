import TransferLedgerReject, { type TransferLedgerRejectProps } from './transfer-ledger-reject';
import { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';

export default {
  title: 'components/transfer/TransferLedgerReject',
  component: TransferLedgerReject,
} as Meta<typeof TransferLedgerReject>;

export const Default: StoryObj<TransferLedgerRejectProps> = {
  args: {
    onClickClose: action('click close'),
  },
};