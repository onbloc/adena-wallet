import AddressBookList, { type AddressBookListProps } from './address-book-list';
import { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';

export default {
  title: 'components/transfer/AddressBookList',
  component: AddressBookList,
} as Meta<typeof AddressBookList>;

export const Default: StoryObj<AddressBookListProps> = {
  args: {
    addressBookInfos: [{
      addressBookId: '1',
      description: '(g1uh...ohno)',
      name: 'Account 1',
    }],
    onClickItem: action('click item'),
  },
};

export const NoAddress: StoryObj<AddressBookListProps> = {
  args: {
    addressBookInfos: [],
    onClickItem: action('click item'),
  },
};