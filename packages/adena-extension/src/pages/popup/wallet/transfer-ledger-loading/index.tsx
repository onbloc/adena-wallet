import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import TransferLedgerLoading from '@components/pages/transfer-ledger-loading/transfer-ledger-loading';
import { isLedgerAccount, AdenaLedgerConnector } from 'adena-module';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { RoutePath } from '@types';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigate';

const TransferLedgerLoadingLayout = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: auto;
  padding: 24px 20px 120px 20px;
`;

const TransferLedgerLoadingContainer = (): JSX.Element => {
  const { wallet } = useWalletContext();
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
    if (!wallet) {
      return null;
    }
    if (!currentAccount || !isLedgerAccount(currentAccount)) {
      return null;
    }

    const connected = await AdenaLedgerConnector.openConnected();
    if (!connected) {
      console.log('Ledger not found');
      return null;
    }
    const ledgerConnector = AdenaLedgerConnector.fromTransport(connected);

    const result = await transactionService
      .createTransactionWithLedger(ledgerConnector, currentAccount, document)
      .then(async ({ signed }) => {
        console.log(signed);
        connected.close();
        const response = await transactionService.sendTransactionByLedger(
          ledgerConnector,
          currentAccount,
          signed,
        );
        return response.hash;
      })
      .catch((error: Error) => {
        console.log(error);
        connected.close();
        if (error.message === 'Transaction signing request was rejected by the user') {
          navigate(RoutePath.TransferLedgerReject);
        }
        return null;
      });
    return result;
  }, [currentAccount, document]);

  return (
    <TransferLedgerLoadingLayout>
      <TransferLedgerLoading document={document} onClickCancel={goBack} />
    </TransferLedgerLoadingLayout>
  );
};

export default TransferLedgerLoadingContainer;
