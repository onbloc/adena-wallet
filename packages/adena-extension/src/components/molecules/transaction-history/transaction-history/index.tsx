import React from 'react';
import { useTheme } from 'styled-components';

import { Text } from '@components/atoms';
import TransactionHistoryList from '@components/molecules/transaction-history/transaction-history-list/transaction-history-list';
import { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { TransactionInfo } from '@types';
import LoadingHistory from '../loading-history';
import {
  TransactionHistoryDescriptionWrapper,
  TransactionHistoryWrapper,
} from './transaction-history.styles';

export interface TransactionHistoryProps {
  status: 'error' | 'loading' | 'success';
  transactionInfoLists: {
    title: string;
    transactions: TransactionInfo[];
  }[];
  queryGRC721TokenUri?: (
    packagePath: string,
    tokenId: string,
    options?: UseQueryOptions<string | null, Error>,
  ) => UseQueryResult<string | null>;
  onClickItem: (hash: string) => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  status,
  transactionInfoLists,
  queryGRC721TokenUri,
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
        <TransactionHistoryList
          key={index}
          {...transactionInfoList}
          queryGRC721TokenUri={queryGRC721TokenUri}
          onClickItem={onClickItem}
        />
      ))}
    </TransactionHistoryWrapper>
  );
};
