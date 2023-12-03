import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TransferLedgerLoading from '@components/transfer/transfer-ledger-loading/transfer-ledger-loading';
import { StdSignDoc, isLedgerAccount } from 'adena-module';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useAdenaContext } from '@hooks/use-context';
import { RoutePath } from '@router/path';

const TransferLedgerLoadingContainer = (): JSX.Element => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { transactionService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const [connected, setConnected] = useState(false);
  const document: StdSignDoc = state.document;

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
        const hash = await transactionService.sendTransaction(transaction);
        return hash;
      })
      .catch((error: Error) => {
        if (error.message === 'Transaction signing request was rejected by the user') {
          navigate(RoutePath.TransferLedgerReject);
        }
        return null;
      });
    return result;
  }, [currentAccount, document]);

  const onClickCancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return <TransferLedgerLoading onClickCancel={onClickCancel} />;
};

export default TransferLedgerLoadingContainer;
