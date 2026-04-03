import { ApproveLoading, type ApproveLoadingProps } from '.';
import { Meta, StoryObj } from '@storybook/react-vite';

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
