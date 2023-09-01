import ApproveAddingNetworkTable, { type ApproveAddingNetworkTableProps } from './approve-adding-network-table';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/approve-adding-network/ApproveAddingNetworkTable',
  component: ApproveAddingNetworkTable,
} as Meta<typeof ApproveAddingNetworkTable>;

export const Default: StoryObj<ApproveAddingNetworkTableProps> = {
  args: {
    name: '',
    rpcUrl: '',
    chainId: '',
  },
};