import AddressInput, { type AddressInputProps } from './address-input';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/transfer/AddressInput',
  component: AddressInput,
} as Meta<typeof AddressInput>;

const addressBookInfos = [
  {
    addressBookId: '1',
    description: '(g1uh...ohno)',
    name: 'Account 1'
  },
  {
    addressBookId: '2',
    description: '(g1uh...ohno)',
    name: 'Account 2'
  },
  {
    addressBookId: '3',
    description: '(g1uh...ohno)',
    name: 'Account 3'
  },
  {
    addressBookId: '4',
    description: '(g1uh...ohno)',
    name: 'Account 4'
  }
];

export const Default: StoryObj<AddressInputProps> = {
  args: {
    opened: false,
    hasError: false,
    errorMessage: 'Invalid address',
    selected: false,
    selectedName: 'Account 1',
    selectedDescription: '(g1ff...jpae)',
    address: '',
    addressBookInfos,
    onClickInputIcon: action('click input icon'),
    onChangeAddress: action('change address'),
    onClickAddressBook: action('click address book')
  },
};

export const NoAddress: StoryObj<AddressInputProps> = {
  args: {
    opened: true,
    hasError: false,
    errorMessage: 'Invalid address',
    selected: false,
    selectedName: undefined,
    selectedDescription: undefined,
    address: '',
    addressBookInfos: [],
    onClickInputIcon: action('click input icon'),
    onChangeAddress: action('change address'),
    onClickAddressBook: action('click address book')
  },
};