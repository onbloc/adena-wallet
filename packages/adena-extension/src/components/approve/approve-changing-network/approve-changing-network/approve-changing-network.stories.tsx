import ApproveChangingNetwork, { type ApproveChangingNetworkProps } from './approve-changing-network';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/approve-changing-network/ApproveChangingNetwork',
  component: ApproveChangingNetwork,
} as Meta<typeof ApproveChangingNetwork>;

export const Default: StoryObj<ApproveChangingNetworkProps> = {
  args: {
    fromChain: {
      name: 'Testnet3'
    },
    toChain: {
      name: 'Onbloc Testnet'
    },
    changable: true,
    changeNetwork: action('changeNetwork'),
    cancel: action('cancel'),
  },
};