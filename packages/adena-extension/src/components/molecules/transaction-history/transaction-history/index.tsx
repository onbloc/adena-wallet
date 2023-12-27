import React from 'react';
import { useTheme } from 'styled-components';

import {
  TransactionHistoryDescriptionWrapper,
  TransactionHistoryWrapper,
} from './transaction-history.styles';
import TransactionHistoryList from '@components/molecules/transaction-history/transaction-history-list/transaction-history-list';
import { Text } from '@components/atoms';
import LoadingHistory from '../loading-history';
import { TransactionInfo } from '@types';

export interface TransactionHistoryProps {
  status: 'error' | 'loading' | 'success';
  transactionInfoLists: {
    title: string;
    transactions: TransactionInfo[];
  }[];
  onClickItem: (hash: string) => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  status,
  transactionInfoLists,
  onClickItem,
}) => {
  const theme = useTheme();
  if (transactionInfoLists.length === 0) {
    if (status === 'loading') {
      return <LoadingHistory />;
    }
    return (
      <TransactionHistoryDescriptionWrapper>
        <Text className='desc' type='body1Reg' color={theme.neutral.a} textAlign='center'>
          No transaction to display
        </Text>
      </TransactionHistoryDescriptionWrapper>
    );
  }

  return (
    <TransactionHistoryWrapper>
      {transactionInfoLists.map((transactionInfoList, index) => (
        <TransactionHistoryList key={index} {...transactionInfoList} onClickItem={onClickItem} />
      ))}
    </TransactionHistoryWrapper>
  );
};
