import React from 'react';
import { TransferLedgerRejectLayoutWrapper } from './transfer-ledger-reject-layout.styles';

export interface TransferLedgerRejectLayoutProps {
  transferLedgerReject: React.ReactNode;
}

const TransferLedgerRejectLayout: React.FC<TransferLedgerRejectLayoutProps> = ({
  transferLedgerReject
}) => {
  return (
    <TransferLedgerRejectLayoutWrapper>
      {transferLedgerReject}
    </TransferLedgerRejectLayoutWrapper>
  );
};

export default TransferLedgerRejectLayout;