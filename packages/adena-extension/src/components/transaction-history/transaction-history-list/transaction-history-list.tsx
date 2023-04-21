import React from 'react';
import { TransactionHistoryListWrapper } from './transaction-history-list.styles';
import TransactionHistoryListItem from '@components/transaction-history/transaction-history-list-item/transaction-history-list-item';
import { TransactionInfo } from '@components/transaction-history/transaction-history/transaction-history';

export interface TransactionHistoryListProps {
  title: string;
  transactions: TransactionInfo[];
}

const TransactionHistoryList: React.FC<TransactionHistoryListProps> = ({
  title,
  transactions
}) => {
  return (
    <TransactionHistoryListWrapper>
      <span className='title'>{title}</span>
      <div className='list-wrapper'>
        {transactions.map((transaction, index) =>
          <TransactionHistoryListItem
            key={index}
            {...transaction}
          />
        )}
      </div>
    </TransactionHistoryListWrapper>
  );
};

export default TransactionHistoryList;