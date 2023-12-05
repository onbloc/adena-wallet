import AccountNameInput, { type AccountNameInputProps } from './account-name-input';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/account-details/AccountNameInput',
  component: AccountNameInput,
} as Meta<typeof AccountNameInput>;

export const Default: StoryObj<AccountNameInputProps> = {
  args: {
    originName: 'Account 1',
    name: 'aslkdfjaslkdfjaklsdfjalksdf',
    setName: action('setName'),
  },
};