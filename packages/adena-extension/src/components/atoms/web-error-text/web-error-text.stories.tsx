import { Meta, StoryObj } from '@storybook/react';
import { WebErrorText } from '.';

export default {
  title: 'components/atoms/WebErrorText',
  component: WebErrorText,
} as Meta<typeof WebErrorText>;

export const Default: StoryObj<typeof WebErrorText> = {
  args: {
    text: 'WebErrorText',
  },
};