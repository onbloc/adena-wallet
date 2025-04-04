import { Meta, StoryObj } from '@storybook/react';
import { ApproveTransactionLoading, type ApproveTransactionLoadingProps } from '.';

export default {
  title: 'components/approve/ApproveTransactionLoading',
  component: ApproveTransactionLoading,
} as Meta<typeof ApproveTransactionLoading>;

export const Default: StoryObj<ApproveTransactionLoadingProps> = {
  args: {
    leftButtonText: 'Cancel',
    rightButtonText: 'Connect',
  },
};
