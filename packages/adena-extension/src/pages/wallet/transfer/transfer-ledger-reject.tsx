import React from 'react';
import TransferLedgerRejectLayout from '@layouts/transfer-ledger-reject-layout/transfer-ledger-reject-layout';
import TransferLedgerRejectContainer from '@containers/transfer-ledger-reject-container/transfer-ledger-reject-container';

const TransferLedgerReject: React.FC = () => {
  return (
    <TransferLedgerRejectLayout
      transferLedgerReject={<TransferLedgerRejectContainer />}
    />
  );
};

export default TransferLedgerReject;