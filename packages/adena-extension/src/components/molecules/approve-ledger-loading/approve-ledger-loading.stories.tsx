import { ApproveLedgerLoading, type ApproveLedgerLoadingProps } from '.';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/approve/ApproveLedgerLoading',
  component: ApproveLedgerLoading,
} as Meta<typeof ApproveLedgerLoading>;

export const Default: StoryObj<ApproveLedgerLoadingProps> = {
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
    onClickCancel: action('cancel'),
  },
};
