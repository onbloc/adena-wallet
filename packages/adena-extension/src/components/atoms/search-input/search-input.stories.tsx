import { SearchInput, type SearchInputProps } from '.';
import { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';

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
