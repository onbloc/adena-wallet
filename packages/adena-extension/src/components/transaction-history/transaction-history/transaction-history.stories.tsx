import TransactionHistory, { TransactionInfo, type TransactionHistoryProps } from './transaction-history';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/transaction-history/TransactionHistory',
  component: TransactionHistory,
} as Meta<typeof TransactionHistory>;

const transferRSendSuccessInfo: TransactionInfo = {
  hash: 'transferRSendSuccessInfoHash',
  logo: 'https://raw.githubusercontent.com/onbloc/adena-resource/main/images/tokens/gnot.svg',
  type: 'TRANSFER',
  status: 'SUCCESS',
  title: 'Send',
  description: 'To: g1n5...123n',
  extraInfo: '',
  amount: {
    value: '-4,000.23',
    denom: 'GNOT'
  },
  valueType: 'DEFAULT',
  onClickItem: action('click item'),
}

const transferReceiveSuccessInfo: TransactionInfo = {
  hash: 'transferReceiveSuccessInfoHash',
  logo: 'https://raw.githubusercontent.com/onbloc/adena-resource/main/images/tokens/gnot.svg',
  type: 'TRANSFER',
  status: 'SUCCESS',
  title: 'Receive',
  description: 'To: g1n5...123n',
  extraInfo: '',
  amount: {
    value: '+4,000',
    denom: 'GNOT'
  },
  valueType: 'ACTIVE',
  onClickItem: action('click item'),
}

const transferRSendFailedInfo: TransactionInfo = {
  hash: 'transferRSendFailedInfoHash',
  logo: 'https://raw.githubusercontent.com/onbloc/adena-resource/main/images/tokens/gnot.svg',
  type: 'TRANSFER',
  status: 'FAIL',
  title: 'Failed',
  description: 'To: g1n5...123n',
  extraInfo: '',
  amount: {
    value: '-4,000.23',
    denom: 'GNOT'
  },
  valueType: 'BLUR',
  onClickItem: action('click item'),
}

const contractSuccessInfo: TransactionInfo = {
  hash: 'contractSuccessInfoHash',
  logo: ``,
  type: 'CONTRACT_CALL',
  status: 'SUCCESS',
  title: 'CreateThread',
  extraInfo: '',
  amount: {
    value: '-4,000.23',
    denom: 'GNOT'
  },
  valueType: 'DEFAULT',
  onClickItem: action('click item'),
}

const multiContractSuccessInfo: TransactionInfo = {
  hash: 'multiContractSuccessInfoHash',
  logo: ``,
  type: 'MULTI_CONTRACT_CALL',
  status: 'SUCCESS',
  title: 'CreateThread',
  extraInfo: '+2',
  amount: {
    value: '-4,000.23',
    denom: 'GNOT'
  },
  valueType: 'DEFAULT',
  onClickItem: action('click item'),
}

const addPackageSuccessInfo: TransactionInfo = {
  hash: 'addPackageSuccessInfoHash',
  logo: ``,
  type: 'ADD_PACKAGE',
  status: 'SUCCESS',
  title: 'AddPkg',
  amount: {
    value: '-4,000.23',
    denom: 'GNOT'
  },
  valueType: 'DEFAULT',
  onClickItem: action('click item'),
}

export const Default: StoryObj<TransactionHistoryProps> = {
  args: {
    transactionInfoLists: [
      {
        title: 'Today',
        transactions: [
          transferRSendSuccessInfo,
          transferReceiveSuccessInfo,
          transferRSendFailedInfo,
        ]
      },
      {
        title: 'Yesterday',
        transactions: [
          contractSuccessInfo,
          multiContractSuccessInfo,
          addPackageSuccessInfo,
        ]
      },
      {
        title: 'Apr 19, 2023',
        transactions: [
          contractSuccessInfo,
          multiContractSuccessInfo,
          addPackageSuccessInfo,
        ]
      }
    ]
  },
};