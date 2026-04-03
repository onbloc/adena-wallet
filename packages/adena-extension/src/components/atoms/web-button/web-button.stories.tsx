import { Meta, StoryObj } from '@storybook/react-vite';
import { WebButton } from '.';

export default {
  title: 'components/atoms/WebButton',
  component: WebButton,
} as Meta<typeof WebButton>;

export const Default: StoryObj<typeof WebButton> = {
  args: {
    figure: 'primary',
    size: 'small',
    text: 'WebButton',
    rightIcon: 'chevronRight',
  },
};