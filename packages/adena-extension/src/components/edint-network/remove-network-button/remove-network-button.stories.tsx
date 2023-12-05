import RemoveNetworkButton, { type RemoveNetworkButtonProps } from './remove-network-button';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/edit-network/RemoveNetworkButton',
  component: RemoveNetworkButton,
} as Meta<typeof RemoveNetworkButton>;

export const Default: StoryObj<RemoveNetworkButtonProps> = {
  args: {
    removeNetwork: action('removeNetwork')
  },
};