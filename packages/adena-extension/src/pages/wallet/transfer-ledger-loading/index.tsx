import React from 'react';
import TransferLedgerLoadingContainer from './transfer-ledger-loading-container';
import styled from 'styled-components';

const TransferLedgerLoadingLayout = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  padding: 24px 20px;
  margin-bottom: 60px;
`;

const TransferLedgerLoading: React.FC = () => {
  return (
    <TransferLedgerLoadingLayout>
      <TransferLedgerLoadingContainer />
    </TransferLedgerLoadingLayout>
  );
};

export default TransferLedgerLoading;
