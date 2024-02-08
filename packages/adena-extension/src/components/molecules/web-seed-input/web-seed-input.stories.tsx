import { Meta, StoryObj } from '@storybook/react';
import { WebSeedInput } from '.';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/molecules/WebSeedInput',
  component: WebSeedInput,
} as Meta<typeof WebSeedInput>;

export const Default: StoryObj<typeof WebSeedInput> = {
  args: {
    onChange: action('onChange'),
  },
};