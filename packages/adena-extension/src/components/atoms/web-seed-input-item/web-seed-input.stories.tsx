import { Meta, StoryObj } from '@storybook/react';
import { WebSeedInputItem } from '.';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/atoms/WebSeedInputItem',
  component: WebSeedInputItem,
} as Meta<typeof WebSeedInputItem>;

export const Default: StoryObj<typeof WebSeedInputItem> = {
  args: {
    index: 1,
    value: '',
    error: false,
    onChange: action('onChange'),
  },
};