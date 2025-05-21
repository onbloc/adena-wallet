import { action } from '@storybook/addon-actions';
import { Meta, StoryObj } from '@storybook/react';
import TransferInput, { type TransferInputProps } from './transfer-input';

export default {
  title: 'components/transfer/TransferInput',
  component: TransferInput,
} as Meta<typeof TransferInput>;

export const Default: StoryObj<TransferInputProps> = {
  args: {
    tokenMetainfo: {
      main: true,
      display: false,
      tokenId: 'tokenId',
      networkId: 'DEFAULT',
      name: 'Gno.land',
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
    memoInput: {
      memo: '',
      onChangeMemo: action('onChangeMemo'),
    },
    isNext: true,
    hasBackButton: true,
    onClickBack: action('click back'),
    onClickCancel: action('click cancel'),
    onClickNext: action('click next'),
  },
};
