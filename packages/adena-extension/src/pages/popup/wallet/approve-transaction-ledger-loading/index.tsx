import React, { useEffect, useState } from 'react';
import { isLedgerAccount, AdenaLedgerConnector } from 'adena-module';
import { TM2Error } from '@gnolang/tm2-js-client';

import { ApproveLedgerLoading } from '@components/molecules';
import { InjectionMessageInstance } from '@inject/message';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useNetwork } from '@hooks/use-network';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

const ApproveTransactionLedgerLoadingContainer: React.FC = () => {
  const { params } = useAppNavigate<RoutePath.ApproveTransactionLoading>();
  const { wallet } = useWalletContext();
  const { transactionService } = useAdenaContext();
  const { document, requestData } = params;
  const { currentAccount } = useCurrentAccount();
  const [completed, setCompleted] = useState(false);
  const { currentNetwork } = useNetwork();

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
    if (!currentAccount || !document || !currentNetwork || !wallet) {
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
      .then(async ({ signed }) => {
        const hash = transactionService.createHash(signed);
        const response = await transactionService
          .sendTransactionByLedger(ledgerConnector, currentAccount, signed)
          .catch((error: TM2Error | Error) => {
            return error;
          });

        if (!response) {
          chrome.runtime.sendMessage(
            InjectionMessageInstance.failure(
              'TRANSACTION_FAILED',
              {
                hash,
                error: null,
              },
              requestData?.key,
            ),
          );
          return true;
        }
        if (response instanceof TM2Error || response instanceof Error) {
          chrome.runtime.sendMessage(
            InjectionMessageInstance.failure(
              'TRANSACTION_FAILED',
              {
                hash,
                error: response,
              },
              requestData?.key,
            ),
          );
          return true;
        }

        chrome.runtime.sendMessage(
          InjectionMessageInstance.success('TRANSACTION_SUCCESS', response, requestData?.key),
        );
        return true;
      })
      .catch((error: Error) => {
        if (error.message.includes('Ledger')) {
          return false;
        }
        if (error.message === 'Transaction signing request was rejected by the user') {
          chrome.runtime.sendMessage(
            InjectionMessageInstance.failure('TRANSACTION_REJECTED', {}, requestData?.key),
          );
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
      InjectionMessageInstance.failure('TRANSACTION_REJECTED', {}, requestData.key),
    );
  };

  return <ApproveLedgerLoading document={document || null} onClickCancel={onClickCancel} />;
};

export default ApproveTransactionLedgerLoadingContainer;
