import { Meta, StoryObj } from '@storybook/react-vite';
import { WebSeedInputItem } from '.';
import { action } from 'storybook/actions';

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