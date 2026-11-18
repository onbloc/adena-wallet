import EditNetwork, { type EditNetworkProps } from '.';
import { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';

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
    savable: false,
    changeName: action('onChangeName'),
    changeRPCUrl: action('onChangeRPCUrl'),
    changeChainId: action('onChangeChainId'),
    clearNetwork: action('clearNetwork'),
    saveNetwork: action('saveNetwork'),
    moveBack: action('moveBack'),
  },
};
