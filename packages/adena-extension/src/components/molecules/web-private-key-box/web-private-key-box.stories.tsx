import { Meta, StoryObj } from '@storybook/react';
import { WebPrivateKeyBox } from '.';

export default {
  title: 'components/molecules/WebPrivateKeyBox',
  component: WebPrivateKeyBox,
} as Meta<typeof WebPrivateKeyBox>;

export const Default: StoryObj<typeof WebPrivateKeyBox> = {
  args: {
    privateKey: 'privateKey',
    showBlur: true,
  },
};