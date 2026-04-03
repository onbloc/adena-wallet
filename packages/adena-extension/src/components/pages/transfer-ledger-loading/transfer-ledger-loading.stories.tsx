import TransferLedgerLoading, { type TransferLedgerLoadingProps } from './transfer-ledger-loading';
import { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';

export default {
  title: 'components/transfer/TransferLedgerLoading',
  component: TransferLedgerLoading,
} as Meta<typeof TransferLedgerLoading>;

export const Default: StoryObj<TransferLedgerLoadingProps> = {
  args: {
    document: {
      msgs: [],
      fee: {
        amount: [
          {
            amount: '1',
            denom: 'ugnot',
          },
        ],
        gas: '5000000',
      },
      chain_id: 'dev',
      memo: '',
      account_number: '0',
      sequence: '1',
    },
    onClickCancel: action('click cancel'),
  },
};
