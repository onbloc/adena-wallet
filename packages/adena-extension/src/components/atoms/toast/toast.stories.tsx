import Toast, { type ToastProps } from './toast';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/atoms/Toast',
  component: Toast,
} as Meta<typeof Toast>;

export const Default: StoryObj<ToastProps> = {
  args: {
    text: 'Tokens successfully received!',
    onFinish: action('onFinish'),
  },
};
