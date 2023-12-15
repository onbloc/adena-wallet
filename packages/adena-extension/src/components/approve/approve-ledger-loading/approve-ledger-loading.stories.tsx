import ApproveLedgerLoading, { type ApproveLedgerLoadingProps } from './approve-ledger-loading';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/approve/ApproveLedgerLoading',
  component: ApproveLedgerLoading,
} as Meta<typeof ApproveLedgerLoading>;

export const Default: StoryObj<ApproveLedgerLoadingProps> = {
  args: {
    onClickCancel: action('cancel'),
  },
};