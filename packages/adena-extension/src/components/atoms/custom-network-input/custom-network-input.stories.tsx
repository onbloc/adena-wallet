import { CustomNetworkInput, type CustomNetworkInputProps } from '.';
import { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';

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
