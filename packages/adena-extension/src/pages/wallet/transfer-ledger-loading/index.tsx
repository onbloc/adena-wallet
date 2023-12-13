import React from 'react';
import TransferLedgerLoadingLayout from '@layouts/transfer-ledger-loading-layout/transfer-ledger-loading-layout';
import TransferLedgerLoadingContainer from './transfer-ledger-loading-container';

const TransferLedgerLoading: React.FC = () => {
  return <TransferLedgerLoadingLayout transferLedgerLoading={<TransferLedgerLoadingContainer />} />;
};

export default TransferLedgerLoading;
