import AddCustomNetworkForm, { type AddCustomNetworkFormProps } from './add-custom-network-form';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/add-custom-network/AddCustomNetworkForm',
  component: AddCustomNetworkForm,
} as Meta<typeof AddCustomNetworkForm>;

export const Default: StoryObj<AddCustomNetworkFormProps> = {
  args: {
    name: '',
    rpcUrl: '',
    hasRPCUrlError: false,
    chainId: '',
    onChangeName: action('onChangeName'),
    onChangeRPCUrl: action('onChangeRPCUrl'),
    onChangeChainId: action('onChangeChainId'),
    save: action('save'),
    cancel: action('cancel'),
  },
};