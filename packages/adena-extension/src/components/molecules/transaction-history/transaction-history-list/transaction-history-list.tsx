import TransactionHistoryListItem from '@components/molecules/transaction-history/transaction-history-list-item/transaction-history-list-item';
import { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { TransactionInfo } from '@types';
import React from 'react';
import { TransactionHistoryListWrapper } from './transaction-history-list.styles';

export interface TransactionHistoryListProps {
  title: string;
  transactions: TransactionInfo[];
  queryGRC721TokenUri?: (
    packagePath: string,
    tokenId: string,
    options?: UseQueryOptions<string | null, Error>,
  ) => UseQueryResult<string | null>;
  onClickItem: (hash: string) => void;
}

const TransactionHistoryList: React.FC<TransactionHistoryListProps> = ({
  title,
  transactions,
  queryGRC721TokenUri,
  onClickItem,
}) => {
  return (
    <TransactionHistoryListWrapper>
      <span className='title'>{title}</span>
      <div className='list-wrapper'>
        {transactions.map((transaction, index) => (
          <TransactionHistoryListItem
            key={index}
            {...transaction}
            queryGRC721TokenUri={queryGRC721TokenUri}
            onClickItem={onClickItem}
          />
        ))}
      </div>
    </TransactionHistoryListWrapper>
  );
};

export default TransactionHistoryList;
