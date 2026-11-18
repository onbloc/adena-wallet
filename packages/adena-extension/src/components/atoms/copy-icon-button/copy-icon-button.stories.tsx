import { CopyIconButton, type CopyIconButtonProps } from '.';
import { Meta, StoryObj } from '@storybook/react-vite';

export default {
  title: 'components/common/CopyButton',
  component: CopyIconButton,
} as Meta<typeof CopyIconButton>;

export const Default: StoryObj<CopyIconButtonProps> = {
  args: {
    copyText: 'hello',
  },
};
