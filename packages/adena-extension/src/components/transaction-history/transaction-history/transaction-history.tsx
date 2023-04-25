import React from 'react';
import { TransactionHistoryWrapper } from './transaction-history.styles';
import TransactionHistoryList from '@components/transaction-history/transaction-history-list/transaction-history-list';

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
  transactionInfoLists,
  onClickItem,
}) => {
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