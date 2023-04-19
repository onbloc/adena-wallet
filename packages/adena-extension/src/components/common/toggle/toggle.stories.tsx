import Toggle, { type ToggleProps } from './toggle';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/common/Toggle',
  component: Toggle,
} as Meta<typeof Toggle>;

export const Activated: StoryObj<ToggleProps> = {
  args: {
    activated: true,
    onToggle: action('on toggle')
  },
};

export const Deactivated: StoryObj<ToggleProps> = {
  args: {
    activated: false,
    onToggle: action('on toggle')
  },
};