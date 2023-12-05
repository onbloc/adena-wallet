import ManageTokenSearchInput, { type ManageTokenSearchInputProps } from './manage-token-search-input';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/manage-token/ManageTokenSearchInput',
  component: ManageTokenSearchInput,
} as Meta<typeof ManageTokenSearchInput>;

export const Default: StoryObj<ManageTokenSearchInputProps> = {
  args: {
    keyword: '',
    onChangeKeyword: action('change keywords'),
    onClickAdded: action('added button click'),
  },
};