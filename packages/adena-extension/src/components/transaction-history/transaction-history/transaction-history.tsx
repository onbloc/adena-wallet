import React from 'react';
import { TransactionHistoryWrapper } from './transaction-history.styles';
import TransactionHistoryList from '@components/transaction-history/transaction-history-list/transaction-history-list';

export interface TransactionInfo {
  hash: string;
  logo: string;
  type: 'TRANSFER' | 'ADD_PACKAGE' | 'CONTRACT_CALL' | 'MULTI_CONTRACT_CALL';
  status: 'SUCCESS' | 'FAIL';
  title: string;
  description?: string;
  extraInfo?: string;
  amount: {
    value: string;
    denom: string;
  };
  valueType: 'DEFAULT' | 'ACTIVE' | 'BLUR';
  onClickItem: (hash: string) => void;
};

export interface TransactionHistoryProps {
  transactionInfoLists: {
    title: string;
    transactions: TransactionInfo[];
  }[];
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactionInfoLists
}) => {
  return (
    <TransactionHistoryWrapper>
      {transactionInfoLists.map((transactionInfoList, index) => (
        <TransactionHistoryList
          key={index}
          {...transactionInfoList}
        />
      ))}
    </TransactionHistoryWrapper>
  );
};

export default TransactionHistory;