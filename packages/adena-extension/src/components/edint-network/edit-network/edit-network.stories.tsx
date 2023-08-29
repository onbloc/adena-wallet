import EditNetwork, { type EditNetworkProps } from './edit-network';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/edit-network/EditNetwork',
  component: EditNetwork,
} as Meta<typeof EditNetwork>;

export const Default: StoryObj<EditNetworkProps> = {
  args: {
    name: '',
    rpcUrl: '',
    chainId: '',
    rpcUrlError: '',
    changeName: action('onChangeName'),
    changeRPCUrl: action('onChangeRPCUrl'),
    changeChainId: action('onChangeChainId'),
    removeNetwork: action('removeNetwork'),
    saveNetwork: action('saveNetwork'),
    moveBack: action('moveBack'),
  },
};