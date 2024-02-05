import { Meta, StoryObj } from '@storybook/react';
import { WebHoldButton } from '.';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/atoms/WebHoldButton',
  component: WebHoldButton,
} as Meta<typeof WebHoldButton>;

export const Default: StoryObj<typeof WebHoldButton> = {
  args: {
    onFinishHold: action('onFinishHold'),
  },
};