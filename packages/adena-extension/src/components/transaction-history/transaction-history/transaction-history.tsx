import React from 'react';
import { TransactionHistoryDescriptionWrapper, TransactionHistoryWrapper } from './transaction-history.styles';
import TransactionHistoryList from '@components/transaction-history/transaction-history-list/transaction-history-list';
import LoadingHistory from '@components/loading-screen/loading-history';
import Text from '@components/text';
import theme from '@styles/theme';

export interface TransactionInfo {
  hash: string;
  logo: string;
  type: 'TRANSFER' | 'ADD_PACKAGE' | 'CONTRACT_CALL' | 'MULTI_CONTRACT_CALL';
  typeName?: string;
  status: 'SUCCESS' | 'FAIL';
  title: string;
  description?: string;
  extraInfo?: string;
  amount: {
    value: string;
    denom: string;
  };
  valueType: 'DEFAULT' | 'ACTIVE' | 'BLUR';
  date: string;
  from?: string;
  to?: string;
  networkFee?: {
    value: string;
    denom: string;
  };
};

export interface TransactionHistoryProps {
  status: 'error' | 'loading' | 'success';
  transactionInfoLists: {
    title: string;
    transactions: TransactionInfo[];
  }[];
  onClickItem: (hash: string) => void;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  status,
  transactionInfoLists,
  onClickItem,
}) => {
  if (transactionInfoLists.length === 0) {
    if (status === 'loading') {
      return <LoadingHistory />;
    }
    return (
      <TransactionHistoryDescriptionWrapper>
        <Text className='desc' type='body1Reg' color={theme.color.neutral[9]} textAlign='center'>
          No transaction to display
        </Text>
      </TransactionHistoryDescriptionWrapper>
    );
  }

  return (
    <TransactionHistoryWrapper>
      {transactionInfoLists.map((transactionInfoList, index) => (
        <TransactionHistoryList
          key={index}
          {...transactionInfoList}
          onClickItem={onClickItem}
        />
      ))}
    </TransactionHistoryWrapper>
  );
};

export default TransactionHistory;