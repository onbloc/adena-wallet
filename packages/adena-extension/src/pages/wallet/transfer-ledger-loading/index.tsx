import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import TransferLedgerLoading from '@components/pages/transfer-ledger-loading/transfer-ledger-loading';
import { isLedgerAccount } from 'adena-module';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useAdenaContext } from '@hooks/use-context';
import { RoutePath } from '@router/path';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navige';

const TransferLedgerLoadingLayout = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: auto;
  padding: 24px 20px;
  margin-bottom: 60px;
`;

const TransferLedgerLoadingContainer = (): JSX.Element => {
  const { navigate, goBack, params } = useAppNavigate<RoutePath.TransferLedgerLoading>();
  const { transactionService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const [connected, setConnected] = useState(false);
  const document = params.document;

  useEffect(() => {
    requestTransaction();
  }, [connected]);

  const requestTransaction = useCallback(() => {
    if (connected) {
      return false;
    }
    setConnected(true);
    return createTransaction().then((result) => {
      if (!result) {
        setTimeout(() => setConnected(false), 1000);
        return false;
      }
      navigate(RoutePath.History);
      return true;
    });
  }, [connected]);

  const createTransaction = useCallback(async () => {
    if (!currentAccount) {
      return null;
    }
    if (!isLedgerAccount(currentAccount)) {
      return null;
    }

    const result = await transactionService
      .createSignatureWithLedger(currentAccount, document)
      .then(async (signature) => {
        const transaction = await transactionService.createTransaction(document, signature);
        const response = await transactionService.sendTransaction(transaction);
        return response.hash;
      })
      .catch((error: Error) => {
        if (error.message === 'Transaction signing request was rejected by the user') {
          navigate(RoutePath.TransferLedgerReject);
        }
        return null;
      });
    return result;
  }, [currentAccount, document]);

  return (
    <TransferLedgerLoadingLayout>
      <TransferLedgerLoading onClickCancel={goBack} />
    </TransferLedgerLoadingLayout>
  );
};

export default TransferLedgerLoadingContainer;
