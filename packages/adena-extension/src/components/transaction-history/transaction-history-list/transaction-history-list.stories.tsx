import TransactionHistoryList, { type TransactionHistoryListProps } from './transaction-history-list';
import { TransactionInfo } from '@components/transaction-history/transaction-history/transaction-history';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import ContractIcon from '@assets/contract.svg';
import AddPackageIcon from '@assets/addpkg.svg';

export default {
  title: 'components/transaction-history/TransactionHistoryList',
  component: TransactionHistoryList,
} as Meta<typeof TransactionHistoryList>;

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
  date: '2023-04-24 07:05:16',
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
  date: '2023-04-24 07:05:16',
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
  date: '2023-04-24 07:05:16',
}

const contractSuccessInfo: TransactionInfo = {
  hash: 'contractSuccessInfoHash',
  logo: `${ContractIcon}`,
  type: 'CONTRACT_CALL',
  status: 'SUCCESS',
  title: 'CreateThread',
  extraInfo: '',
  amount: {
    value: '-4,000.23',
    denom: 'GNOT'
  },
  valueType: 'DEFAULT',
  date: '2023-04-24 07:05:16',
}

const multiContractSuccessInfo: TransactionInfo = {
  hash: 'multiContractSuccessInfoHash',
  logo: `${ContractIcon}`,
  type: 'MULTI_CONTRACT_CALL',
  status: 'SUCCESS',
  title: 'CreateThread',
  extraInfo: '+2',
  amount: {
    value: '-4,000.23',
    denom: 'GNOT'
  },
  valueType: 'DEFAULT',
  date: '2023-04-24 07:05:16',
}

const addPackageSuccessInfo: TransactionInfo = {
  hash: 'addPackageSuccessInfoHash',
  logo: `${AddPackageIcon}`,
  type: 'ADD_PACKAGE',
  status: 'SUCCESS',
  title: 'AddPkg',
  amount: {
    value: '-4,000.23',
    denom: 'GNOT'
  },
  valueType: 'DEFAULT',
  date: '2023-04-24 07:05:16',
}

export const Default: StoryObj<TransactionHistoryListProps> = {
  args: {
    title: 'Today',
    transactions: [
      transferRSendSuccessInfo,
      transferReceiveSuccessInfo,
      transferRSendFailedInfo,
      contractSuccessInfo,
      multiContractSuccessInfo,
      addPackageSuccessInfo
    ],
    onClickItem: action('click item'),
  },
};