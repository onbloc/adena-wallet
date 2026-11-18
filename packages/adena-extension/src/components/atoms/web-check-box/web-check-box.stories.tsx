import { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';

import { WebCheckBox } from '.';

export default {
  title: 'components/atoms/WebCheckBox',
  component: WebCheckBox,
} as Meta<typeof WebCheckBox>;

export const Default: StoryObj<typeof WebCheckBox> = {
  args: {
    checked: true,
    onClick: action('click WebCheckBox'),
  },
};