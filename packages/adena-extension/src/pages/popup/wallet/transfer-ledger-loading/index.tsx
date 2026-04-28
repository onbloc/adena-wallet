import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import TransferLedgerLoading from '@components/pages/transfer-ledger-loading/transfer-ledger-loading';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { createNotificationSendMessageByHash } from '@inject/message/methods/transaction-event';
import mixins from '@styles/mixins';
import { RoutePath } from '@types';
import { AdenaLedgerConnector, isLedgerAccount } from 'adena-module';

const TransferLedgerLoadingLayout = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: 100%;
  padding: 24px 20px 120px 20px;
`;

const TransferLedgerLoadingContainer = (): JSX.Element => {
  const { wallet } = useWalletContext();
  const { navigate, goBack, params } = useAppNavigate<RoutePath.TransferLedgerLoading>();
  const { transactionService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const [connected, setConnected] = useState(false);
  const document = params.document;
  const summary = params.summary;

  useEffect(() => {
    requestTransaction();
  }, [connected]);

  // FIXME(ADN-755): same infinite-retry pattern as the Cosmos loading page.
  // When createTransaction returns null for any non-UserRejected reason
  // (device locked, app not open, transport failure, broadcast error), the
  // setTimeout below flips `connected` back to false which re-fires the
  // useEffect and re-runs the entire flow every second. The Cosmos page was
  // rewritten to navigate to a dedicated reject screen per error kind; the
  // Gno path is left unchanged here to limit blast radius and should be
  // ported in a follow-up ticket.
  const requestTransaction = useCallback(() => {
    if (connected) {
      return false;
    }
    setConnected(true);
    return createTransaction().then((hash) => {
      if (!hash) {
        setTimeout(() => setConnected(false), 1000);
        return false;
      }
      // If we came from TransferSummary, route back so its existing RESULT
      // screen renders (same UX as HD/PK transfers). NFT transfers reuse
      // this page without summary → fall back to the historical direct
      // History navigation.
      if (summary) {
        navigate(RoutePath.TransferSummary, {
          state: {
            ...summary,
            ledgerResult: { status: 'SUCCESS', hash },
          },
        });
      } else {
        navigate(RoutePath.History);
      }
      return true;
    });
  }, [connected, navigate, summary]);

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

    const hash = await transactionService
      .createTransactionWithLedger(ledgerConnector, currentAccount, document)
      .then(async ({ signed }) => {
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
    if (hash) {
      createNotificationSendMessageByHash(hash);
    }
    return hash;
  }, [currentAccount, document, navigate, transactionService, wallet]);

  return (
    <TransferLedgerLoadingLayout>
      <TransferLedgerLoading document={document} onClickCancel={goBack} />
    </TransferLedgerLoadingLayout>
  );
};

export default TransferLedgerLoadingContainer;
