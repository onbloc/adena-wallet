import AddCustomNetworkButton, { type AddCustomNetworkButtonProps } from './add-custom-network-button';
import { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';

export default {
  title: 'components/change-network/AddCustomNetworkButton',
  component: AddCustomNetworkButton,
} as Meta<typeof AddCustomNetworkButton>;

export const Default: StoryObj<AddCustomNetworkButtonProps> = {
  args: {
    onClick: action('add custom token click'),
  },
};