import TransferInput, { type TransferInputProps } from './transfer-input';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/transfer/TransferInput',
  component: TransferInput,
} as Meta<typeof TransferInput>;

export const Default: StoryObj<TransferInputProps> = {
  args: {
    tokenMetainfo: {
      main: true,
      display: false,
      tokenId: 'Gnoland',
      networkId: 'DEFAULT',
      name: 'Gnoland',
      image: '',
      symbol: 'GNOT',
      type: 'gno-native',
      decimals: 6,
    },
    balanceInput: {
      hasError: false,
      amount: '132123123123',
      denom: 'GNOT',
      description: 'Balance: 342,234.0003 GNOT',
      onChangeAmount: action('change amount'),
      onClickMax: action('click max button'),
    },
    addressInput: {
      opened: false,
      hasError: false,
      errorMessage: 'Invalid address',
      selected: false,
      selectedName: '',
      selectedDescription: '(g1ff...jpae)',
      address: '',
      addressBookInfos: [],
      onClickInputIcon: action('click input icon'),
      onChangeAddress: action('change address'),
      onClickAddressBook: action('click address book'),
    },
    isNext: Promise.resolve(true),
    hasBackButton: true,
    onClickBack: action('click back'),
    onClickCancel: action('click cancel'),
    onClickNext: action('click next'),
  },
};