import { Meta, StoryObj } from '@storybook/react';
import { WebCopyButton } from '.';

export default {
  title: 'components/atoms/WebCopyButton',
  component: WebCopyButton,
} as Meta<typeof WebCopyButton>;

export const Default: StoryObj<typeof WebCopyButton> = {
  args: {
    copyText: '123',
  },
};