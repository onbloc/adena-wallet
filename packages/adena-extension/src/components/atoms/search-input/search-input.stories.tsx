import { SearchInput, type SearchInputProps } from '.';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/common/SearchInput',
  component: SearchInput,
} as Meta<typeof SearchInput>;

export const Default: StoryObj<SearchInputProps> = {
  args: {
    keyword: '',
    onChangeKeyword: action('change keyword'),
  },
};
