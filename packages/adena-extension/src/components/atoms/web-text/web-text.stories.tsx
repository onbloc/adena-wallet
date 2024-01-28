import { Meta, StoryObj } from '@storybook/react';
import { WebText } from '.';

export default {
  title: 'components/atoms/WebText',
  component: WebText,
} as Meta<typeof WebText>;

export const Default: StoryObj<typeof WebText> = {
  args: {
    type: 'title1',
    color: '#000000',
    style: {},
    textCenter: true,
    children: 'WebText',
  },
};