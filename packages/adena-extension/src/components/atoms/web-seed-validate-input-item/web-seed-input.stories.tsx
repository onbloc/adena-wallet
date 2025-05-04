import { action } from '@storybook/addon-actions';
import { Meta, StoryObj } from '@storybook/react';
import { WebSeedValidateInputItem } from '.';

export default {
  title: 'components/atoms/WebSeedValidateInputItem',
  component: WebSeedValidateInputItem,
} as Meta<typeof WebSeedValidateInputItem>;

export const Default: StoryObj<typeof WebSeedValidateInputItem> = {
  args: {
    index: 1,
    value: '',
    error: false,
    onChange: action('onChange'),
  },
};
