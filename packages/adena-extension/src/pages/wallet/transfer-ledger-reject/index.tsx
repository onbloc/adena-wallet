import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import TransferLedgerReject from '@components/transfer/transfer-ledger-reject/transfer-ledger-reject';
import { RoutePath } from '@router/path';

const TransferLedgerRejectLayout = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  padding: 24px 20px;
  margin-bottom: 60px;
`;

const TransferLedgerRejectContainer: React.FC = () => {
  const navigate = useNavigate();

  const onClickClose = useCallback(() => {
    navigate(RoutePath.Wallet);
  }, [navigate]);

  return (
    <TransferLedgerRejectLayout>
      <TransferLedgerReject onClickClose={onClickClose} />
    </TransferLedgerRejectLayout>
  );
};

export default TransferLedgerRejectContainer;
