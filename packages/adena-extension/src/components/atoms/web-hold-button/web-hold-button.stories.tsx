import { Meta, StoryObj } from '@storybook/react-vite';
import { WebHoldButton } from '.';
import { action } from 'storybook/actions';

export default {
  title: 'components/atoms/WebHoldButton',
  component: WebHoldButton,
} as Meta<typeof WebHoldButton>;

export const Default: StoryObj<typeof WebHoldButton> = {
  args: {
    onFinishHold: action('onFinishHold'),
  },
};