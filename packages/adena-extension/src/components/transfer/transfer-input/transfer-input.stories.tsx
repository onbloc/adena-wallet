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
      tokenId: 'Gnoland',
      name: 'Gnoland',
      chainId: 'GNOLAND',
      networkId: 'test3',
      image: 'https://raw.githubusercontent.com/onbloc/adena-resource/main/images/tokens/gnot.svg',
      pkgPath: '',
      symbol: 'GNOT',
      type: 'NATIVE',
      decimals: 6,
      denom: 'GNOT',
      minimalDenom: 'ugnot',
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
      onClickAddressBook: action('click address book')
    },
    isNext: true,
    hasBackButton: true,
    onClickBack: action('click back'),
    onClickCancel: action('click cancel'),
    onClickNext: action('click next')
  },
};