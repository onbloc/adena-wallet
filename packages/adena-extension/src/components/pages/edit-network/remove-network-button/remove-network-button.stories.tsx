import RemoveNetworkButton, { type RemoveNetworkButtonProps } from './remove-network-button';
import { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';

export default {
  title: 'components/edit-network/RemoveNetworkButton',
  component: RemoveNetworkButton,
} as Meta<typeof RemoveNetworkButton>;

export const Default: StoryObj<RemoveNetworkButtonProps> = {
  args: {
    clearNetwork: action('clearNetwork'),
  },
};
