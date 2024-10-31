import { action } from '@storybook/addon-actions';
import { Meta, StoryObj } from '@storybook/react';
import NFTTransferInput, { type NFTTransferInputProps } from './nft-transfer-input';

export default {
  title: 'components/transfer/NFTTransferInput',
  component: NFTTransferInput,
} as Meta<typeof NFTTransferInput>;

export const Default: StoryObj<NFTTransferInputProps> = {
  args: {
    grc721Token: {
      metadata: null,
      name: '',
      networkId: '',
      packagePath: '',
      symbol: '',
      tokenId: '',
      type: 'grc721',
      isMetadata: true,
      isTokenUri: true,
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
