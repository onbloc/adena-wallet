import { UnderlineTextButton, type UnderlineTextButtonProps } from '.';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/common/UnderlineTextButton',
  component: UnderlineTextButton,
} as Meta<typeof UnderlineTextButton>;

export const Default: StoryObj<UnderlineTextButtonProps> = {
  args: {
    text: 'Underline Text',
    onClick: action('add custom token click'),
  },
};
