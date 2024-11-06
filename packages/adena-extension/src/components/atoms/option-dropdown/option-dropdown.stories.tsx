import { Meta, StoryObj } from '@storybook/react';
import OptionDropdown, { type OptionDropdownProps } from './option-dropdown';

export default {
  title: 'components/common/OptionDropdown',
  component: OptionDropdown,
} as Meta<typeof OptionDropdown>;

export const Default: StoryObj<OptionDropdownProps> = {
  args: {},
};
