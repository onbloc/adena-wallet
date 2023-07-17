import AddCustomNetwork, { type AddCustomNetworkProps } from './add-custom-network';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/add-custom-network/AddCustomNetwork',
  component: AddCustomNetwork,
} as Meta<typeof AddCustomNetwork>;

export const Default: StoryObj<AddCustomNetworkProps> = {
  args: {
    name: '',
    rpcUrl: '',
    chainId: '',
    onChangeName: action('onChangeName'),
    onChangeRPCUrl: action('onChangeRPCUrl'),
    onChangeChainId: action('onChangeChainId'),
    hasRPCUrlError: false,
    save: action('save'),
    cancel: action('cancel'),
    moveBack: action('moveBack'),
  },
};