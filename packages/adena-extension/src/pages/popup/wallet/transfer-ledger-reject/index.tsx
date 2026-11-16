import React, { useCallback } from 'react';
import styled from 'styled-components';

import TransferLedgerReject from '@components/pages/transfer-ledger-reject/transfer-ledger-reject';
import { RoutePath } from '@types';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigate';

const TransferLedgerRejectLayout = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: 100%;
  padding: 24px 20px;
  margin-bottom: 60px;
`;

const TransferLedgerRejectContainer: React.FC = () => {
  const { navigate, params } = useAppNavigate<RoutePath.TransferLedgerReject>();

  const onClickClose = useCallback(() => {
    navigate(RoutePath.Wallet);
  }, [navigate]);

  return (
    <TransferLedgerRejectLayout>
      <TransferLedgerReject
        onClickClose={onClickClose}
        title={params?.title}
        desc={params?.desc}
      />
    </TransferLedgerRejectLayout>
  );
};

export default TransferLedgerRejectContainer;
