import CustomNetworkInput, { type CustomNetworkInputProps } from './custom-network-input';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/common/CustomNetworkInput',
  component: CustomNetworkInput,
} as Meta<typeof CustomNetworkInput>;

export const Default: StoryObj<CustomNetworkInputProps> = {
  args: {
    name: '',
    rpcUrl: '',
    rpcUrlError: '',
    chainId: '',
    changeName: action('onChangeName'),
    changeRPCUrl: action('onChangeRPCUrl'),
    changeChainId: action('onChangeChainId'),
  },
};