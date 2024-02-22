import React, { useEffect, useState } from 'react';
import { AdenaLedgerConnector, isLedgerAccount } from 'adena-module';

import { ApproveLedgerLoading } from '@components/molecules';
import { InjectionMessageInstance } from '@inject/message';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

const ApproveSignLedgerLoadingContainer: React.FC = () => {
  const { wallet } = useWalletContext();
  const { params } = useAppNavigate<RoutePath.ApproveSignLoading>();
  const { transactionService } = useAdenaContext();
  const { document, requestData } = params;
  const { currentAccount } = useCurrentAccount();
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (currentAccount) {
      requestTransaction();
    }
  }, [currentAccount]);

  const requestTransaction = async (): Promise<void> => {
    if (completed) {
      return;
    }
    const result = await createLedgerTransaction();
    setCompleted(result);
    setTimeout(() => !result && requestTransaction(), 1000);
  };

  const createLedgerTransaction = async (): Promise<boolean> => {
    if (!currentAccount || !document || !wallet) {
      return false;
    }

    if (!isLedgerAccount(currentAccount)) {
      return false;
    }

    const connected = await AdenaLedgerConnector.openConnected();
    if (!connected) {
      console.log('Ledger not found');
      return false;
    }
    const ledgerConnector = AdenaLedgerConnector.fromTransport(connected);

    const result = await transactionService
      .createTransactionWithLedger(ledgerConnector, currentAccount, document)
      .then(async ({ signature }) => {
        chrome.runtime.sendMessage(
          InjectionMessageInstance.success('SIGN_AMINO', { document, signature }, requestData?.key),
        );
        return true;
      })
      .catch((error: Error) => {
        if (error.message === 'Transaction signing request was rejected by the user') {
          chrome.runtime.sendMessage(
            InjectionMessageInstance.failure('SIGN_REJECTED', {}, requestData?.key),
          );
          return true;
        }
        if (error.message.includes('Ledger')) {
          return false;
        }
        return false;
      });
    return result;
  };

  const onClickCancel = (): void => {
    if (!requestData) {
      window.close();
      return;
    }
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure('SIGN_REJECTED', requestData.data, requestData.key),
    );
  };

  return <ApproveLedgerLoading document={document || null} onClickCancel={onClickCancel} />;
};

export default ApproveSignLedgerLoadingContainer;
