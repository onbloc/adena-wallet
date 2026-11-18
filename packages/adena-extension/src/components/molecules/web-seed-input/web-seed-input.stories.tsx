import { Meta, StoryObj } from '@storybook/react-vite';
import { WebSeedInput } from '.';
import { action } from 'storybook/actions';

export default {
  title: 'components/molecules/WebSeedInput',
  component: WebSeedInput,
} as Meta<typeof WebSeedInput>;

export const Default: StoryObj<typeof WebSeedInput> = {
  args: {
    onChange: action('onChange'),
  },
};