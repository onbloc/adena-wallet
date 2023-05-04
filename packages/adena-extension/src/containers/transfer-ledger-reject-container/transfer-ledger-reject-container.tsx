import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TransferLedgerReject from '@components/transfer/transfer-ledger-reject/transfer-ledger-reject';
import { RoutePath } from '@router/path';

const TransferLedgerRejectContainer: React.FC = () => {
  const navigate = useNavigate();

  const onClickClose = useCallback(() => {
    navigate(RoutePath.Wallet);
  }, [navigate])

  return (
    <TransferLedgerReject
      onClickClose={onClickClose}
    />
  );
};

export default TransferLedgerRejectContainer;