import { Meta, StoryObj } from '@storybook/react';
import { WebSeedBox } from '.';

export default {
  title: 'components/molecules/WebSeedBox',
  component: WebSeedBox,
} as Meta<typeof WebSeedBox>;

export const Default: StoryObj<typeof WebSeedBox> = {
  args: {
    seeds: ['seed', 'seed', 'seed', 'seed'],
    showBlur: true,
  },
};