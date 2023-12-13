import React from 'react';
import styled from 'styled-components';

import TransferLedgerRejectContainer from './transfer-ledger-reject-container';

const TransferLedgerRejectLayout = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  padding: 24px 20px;
  margin-bottom: 60px;
`;

const TransferLedgerReject: React.FC = () => {
  return (
    <TransferLedgerRejectLayout>
      <TransferLedgerRejectContainer />
    </TransferLedgerRejectLayout>
  );
};

export default TransferLedgerReject;
