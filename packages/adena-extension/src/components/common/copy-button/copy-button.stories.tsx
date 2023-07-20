import CopyButton, { type CopyButtonProps } from './copy-button';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/common/CopyButton',
  component: CopyButton,
} as Meta<typeof CopyButton>;

export const Default: StoryObj<CopyButtonProps> = {
  args: {
    copyText: 'hello'
  },
};