import ApproveLoading, { type ApproveLoadingProps } from './approve-loading';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/approve/ApproveLoading',
  component: ApproveLoading,
} as Meta<typeof ApproveLoading>;

export const Default: StoryObj<ApproveLoadingProps> = {
  args: {
    leftButtonText: 'Cancel',
    rightButtonText: 'Connect',
  },
};