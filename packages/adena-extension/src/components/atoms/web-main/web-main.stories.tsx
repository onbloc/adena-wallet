import { WebMain } from '.';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/atoms/WebMain',
  component: WebMain,
} as Meta<typeof WebMain>;

export const Default: StoryObj<typeof WebMain> = {
  args: {},
};