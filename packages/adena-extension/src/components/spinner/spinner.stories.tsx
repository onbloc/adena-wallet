import Spinner, { type SpinnerProps } from './spinner';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/common/Spinner',
  component: Spinner,
} as Meta<typeof Spinner>;

export const Default: StoryObj<SpinnerProps> = {
  args: {
    size: 200
  },
};