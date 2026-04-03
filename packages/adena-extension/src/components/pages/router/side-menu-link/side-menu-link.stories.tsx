import SideMenuLink, { type SideMenuLinkProps } from './side-menu-link';
import { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';

export default {
  title: 'components/common/SideMenuLink',
  component: SideMenuLink,
} as Meta<typeof SideMenuLink>;

export const Default: StoryObj<SideMenuLinkProps> = {
  args: {
    text: '',
    onClick: action('onClick'),
  },
};