import { CopyIconButton, type CopyIconButtonProps } from '.';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/common/CopyButton',
  component: CopyIconButton,
} as Meta<typeof CopyIconButton>;

export const Default: StoryObj<CopyIconButtonProps> = {
  args: {
    copyText: 'hello',
  },
};
