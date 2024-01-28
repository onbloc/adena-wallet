import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

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