import AddCustomNetworkButton, { type AddCustomNetworkButtonProps } from './add-custom-network-button';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/change-network/AddCustomNetworkButton',
  component: AddCustomNetworkButton,
} as Meta<typeof AddCustomNetworkButton>;

export const Default: StoryObj<AddCustomNetworkButtonProps> = {
  args: {
    onClick: action('add custom token click')
  },
};