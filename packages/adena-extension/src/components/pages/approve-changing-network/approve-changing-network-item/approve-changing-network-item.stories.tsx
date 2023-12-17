import ApproveChangingNetworkItem, { type ApproveChangingNetworkItemProps } from './approve-changing-network-item';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/approve-changing-network-item/ApproveChangingNetworkItem',
  component: ApproveChangingNetworkItem,
} as Meta<typeof ApproveChangingNetworkItem>;

export const Default: StoryObj<ApproveChangingNetworkItemProps> = {
  args: {
    name: 'Testnet3',
  },
};