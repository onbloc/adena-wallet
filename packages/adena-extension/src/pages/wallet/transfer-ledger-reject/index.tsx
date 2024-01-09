import React, { useCallback } from 'react';
import styled from 'styled-components';

import TransferLedgerReject from '@components/pages/transfer-ledger-reject/transfer-ledger-reject';
import { RoutePath } from '@router/path';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigate';

const TransferLedgerRejectLayout = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: auto;
  padding: 24px 20px;
  margin-bottom: 60px;
`;

const TransferLedgerRejectContainer: React.FC = () => {
  const { navigate } = useAppNavigate();

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
