import TransactionHistoryListItem, { type TransactionHistoryListItemProps } from './transaction-history-list-item';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/transaction-history/TransactionHistoryListItem',
  component: TransactionHistoryListItem,
} as Meta<typeof TransactionHistoryListItem>;

export const Default: StoryObj<TransactionHistoryListItemProps> = {
  args: {
    hash: 'hash1',
    logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
    type: 'TRANSFER',
    status: 'SUCCESS',
    title: 'Send',
    description: 'To: g1n5...123n',
    extraInfo: '',
    amount: {
      value: '-4,000',
      denom: 'GNOT',
    },
    valueType: 'DEFAULT',
    onClickItem: action('click item'),
  },
};


export const TransferSendSuccess: StoryObj<TransactionHistoryListItemProps> = {
  args: {
    hash: 'transferSendSuccessInfoHash',
    logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
    type: 'TRANSFER',
    status: 'SUCCESS',
    title: 'Send',
    description: 'To: g1n5...123n',
    extraInfo: '',
    amount: {
      value: '-4,000.23',
      denom: 'GNOT',
    },
    valueType: 'DEFAULT',
    onClickItem: action('click item'),
  },
}

export const TransferReceiveSuccess: StoryObj<TransactionHistoryListItemProps> = {
  args: {
    hash: 'transferReceiveSuccessInfoHash',
    logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
    type: 'TRANSFER',
    status: 'SUCCESS',
    title: 'Receive',
    description: 'To: g1n5...123n',
    extraInfo: '',
    amount: {
      value: '+4,000',
      denom: 'GNOT',
    },
    valueType: 'ACTIVE',
    onClickItem: action('click item'),
  },
}

export const TransferSendFailed: StoryObj<TransactionHistoryListItemProps> = {
  args: {
    hash: 'transferSendFailedInfoHash',
    logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
    type: 'TRANSFER',
    status: 'FAIL',
    title: 'Failed',
    description: 'To: g1n5...123n',
    extraInfo: '',
    amount: {
      value: '-4,000.23',
      denom: 'GNOT',
    },
    valueType: 'BLUR',
    onClickItem: action('click item'),
  },
}

export const ContractSuccess: StoryObj<TransactionHistoryListItemProps> = {
  args: {
    hash: 'contractSuccessInfoHash',
    logo: '',
    type: 'CONTRACT_CALL',
    status: 'SUCCESS',
    title: 'CreateThread',
    extraInfo: '',
    amount: {
      value: '-4,000.23',
      denom: 'GNOT',
    },
    valueType: 'DEFAULT',
    onClickItem: action('click item'),
  },
}

export const MultiContractSuccess: StoryObj<TransactionHistoryListItemProps> = {
  args: {
    hash: 'multiContractSuccessInfoHash',
    logo: '',
    type: 'MULTI_CONTRACT_CALL',
    status: 'SUCCESS',
    title: 'CreateThread',
    extraInfo: '+2',
    amount: {
      value: '-4,000.23',
      denom: 'GNOT',
    },
    valueType: 'DEFAULT',
    onClickItem: action('click item'),
  },
}

export const AddPackageSuccess: StoryObj<TransactionHistoryListItemProps> = {
  args: {
    hash: 'addPackageSuccessInfoHash',
    logo: '',
    type: 'ADD_PACKAGE',
    status: 'SUCCESS',
    title: 'AddPkg',
    amount: {
      value: '-4,000.23',
      denom: 'GNOT',
    },
    valueType: 'DEFAULT',
    onClickItem: action('click item'),
  },
}