import React from 'react';
import { TransferLedgerLoadingLayoutWrapper } from './transfer-ledger-loading-layout.styles';

export interface TransferLedgerLoadingLayoutProps {
  transferLedgerLoading: React.ReactNode;
}

const TransferLedgerLoadingLayout: React.FC<TransferLedgerLoadingLayoutProps> = ({ transferLedgerLoading }) => {
  return (
    <TransferLedgerLoadingLayoutWrapper>
      {transferLedgerLoading}
    </TransferLedgerLoadingLayoutWrapper>
  );
};

export default TransferLedgerLoadingLayout;