import MainManageTokenButton, { type MainManageTokenButtonProps } from './main-manage-token-button';
import { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';

export default {
  title: 'components/main/MainManageTokenButton',
  component: MainManageTokenButton,
} as Meta<typeof MainManageTokenButton>;

export const Default: StoryObj<MainManageTokenButtonProps> = {
  args: {
    onClick: action('manage token click'),
  },
};
