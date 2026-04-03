import { Spinner, type SpinnerProps } from '.';
import { Meta, StoryObj } from '@storybook/react-vite';

export default {
  title: 'components/common/Spinner',
  component: Spinner,
} as Meta<typeof Spinner>;

export const Default: StoryObj<SpinnerProps> = {
  args: {
    size: 200,
  },
};
