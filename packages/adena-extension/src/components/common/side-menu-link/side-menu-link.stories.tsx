import SideMenuLink, { type SideMenuLinkProps } from './side-menu-link';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/common/SideMenuLink',
  component: SideMenuLink,
} as Meta<typeof SideMenuLink>;

export const Default: StoryObj<SideMenuLinkProps> = {
  args: {
    text: '',
    onClick: action('onClick')
  },
};