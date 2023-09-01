import ApproveAddingNetwork, { type ApproveAddingNetworkProps } from './approve-adding-network';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/approve-adding-network/ApproveAddingNetwork',
  component: ApproveAddingNetwork,
} as Meta<typeof ApproveAddingNetwork>;

export const Default: StoryObj<ApproveAddingNetworkProps> = {
  args: {
    networkInfo: {
      name: '',
      rpcUrl: '',
      chainId: '',
    },
    logo: '',
    approvable: true,
    approve: action('approve'),
    cancel: action('cancel'),
  },
};