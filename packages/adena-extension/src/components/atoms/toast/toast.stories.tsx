import Toast, { type ToastProps } from './toast';
import { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';

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
