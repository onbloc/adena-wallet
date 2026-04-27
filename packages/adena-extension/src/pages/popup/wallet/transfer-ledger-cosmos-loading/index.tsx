import { useCallback, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';

import TransferLedgerLoading from '@components/pages/transfer-ledger-loading/transfer-ledger-loading';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { createNotificationSendMessageByHash } from '@inject/message/methods/transaction-event';
import mixins from '@styles/mixins';
import { RoutePath } from '@types';
import {
  AdenaLedgerConnector,
  CosmosDocument,
  Document,
  isLedgerAccount,
  LedgerError,
  LedgerErrorKind,
} from 'adena-module';

const TransferLedgerCosmosLoadingLayout = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: 100%;
  padding: 24px 20px 120px 20px;
`;

// TransferLedgerLoading presentational is shaped around Gno Document. Adapt
// CosmosDocument to it so the same review table can be reused without forking
// another near-identical component.
function toCompatDocument(cosmos: CosmosDocument): Document {
  return {
    chain_id: cosmos.chainId,
    account_number: cosmos.accountNumber ?? '',
    sequence: cosmos.sequence ?? '',
    fee: {
      gas: cosmos.fee.gas,
      amount: cosmos.fee.amount.map((a) => ({
        denom: a.denom,
        amount: a.amount,
      })),
    },
    msgs: [],
    memo: cosmos.memo,
  };
}

interface RejectScreenCopy {
  title: string;
  desc: string;
}

const LEDGER_ERROR_COPY: Record<LedgerErrorKind, RejectScreenCopy> = {
  DeviceLocked: {
    title: 'Ledger Device Locked',
    desc: 'Unlock your Ledger device and try the\ntransaction again.',
  },
  AppNotOpen: {
    title: 'Cosmos App Not Open',
    desc: 'Open the Cosmos app on your Ledger\nand try the transaction again.',
  },
  UserRejected: {
    title: 'Transaction Rejected',
    desc: 'The transaction has been rejected on\nyour ledger device. Please approve the\ntransaction in your wallet to complete\nthe transaction.',
  },
  Timeout: {
    title: 'Ledger Timed Out',
    desc: 'No response from your Ledger device.\nPlease try the transaction again.',
  },
  TransportFailed: {
    title: 'Ledger Disconnected',
    desc: 'Reconnect your Ledger device and try\nthe transaction again.',
  },
  Unknown: {
    title: 'Ledger Signing Failed',
    desc: 'An unexpected error occurred while\nsigning. Please try again.',
  },
};

const SIGN_FAILURE_COPY: RejectScreenCopy = {
  title: 'Signing Failed',
  desc: 'The transaction could not be signed.\nPlease try again.',
};

const BROADCAST_FAILURE_COPY: RejectScreenCopy = {
  title: 'Broadcast Failed',
  desc: 'The transaction was signed but could\nnot be broadcast. Check your network\nand try again.',
};

const LEDGER_NOT_FOUND_COPY: RejectScreenCopy = {
  title: 'Ledger Not Connected',
  desc: 'Connect your Ledger device and try\nthe transaction again.',
};

const TransferLedgerCosmosLoadingContainer = (): JSX.Element => {
  const { navigate, goBack, params } = useAppNavigate<RoutePath.TransferLedgerCosmosLoading>();
  const { transactionService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const startedRef = useRef(false);
  const document = params.document;
  const summary = params.summary;
  const compatDocument = useMemo(() => toCompatDocument(document), [document]);

  const navigateToReject = useCallback(
    (copy: RejectScreenCopy) => {
      navigate(RoutePath.TransferLedgerReject, { state: copy });
    },
    [navigate],
  );

  // Sign and broadcast are intentionally split: a broadcast failure must not
  // re-enter the signing flow with a stale signed tx (sequence would already
  // be consumed). Each phase navigates to its own reject screen on failure;
  // there is no automatic retry — recovery requires the user to start over.
  const run = useCallback(async () => {
    if (!currentAccount || !isLedgerAccount(currentAccount)) {
      return;
    }

    const transport = await AdenaLedgerConnector.openConnected();
    if (!transport) {
      navigateToReject(LEDGER_NOT_FOUND_COPY);
      return;
    }
    const ledgerConnector = AdenaLedgerConnector.fromTransport(transport);

    let signed;
    try {
      signed = await transactionService.signCosmosWithLedger(
        ledgerConnector,
        currentAccount,
        document,
      );
    } catch (error) {
      if (error instanceof LedgerError) {
        navigateToReject(LEDGER_ERROR_COPY[error.kind]);
      } else {
        navigateToReject(SIGN_FAILURE_COPY);
      }
      return;
    } finally {
      await transport.close().catch(() => undefined);
    }

    try {
      const result = await transactionService.broadcastCosmos(signed, document.chainId);
      createNotificationSendMessageByHash(result.txhash);
      if (summary) {
        navigate(RoutePath.TransferSummary, {
          state: {
            ...summary,
            ledgerResult: { status: 'SUCCESS', hash: result.txhash },
          },
        });
      } else {
        navigate(RoutePath.History);
      }
    } catch (error) {
      console.log(error);
      navigateToReject(BROADCAST_FAILURE_COPY);
    }
  }, [currentAccount, document, navigate, navigateToReject, summary, transactionService]);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    run();
  }, [run]);

  return (
    <TransferLedgerCosmosLoadingLayout>
      <TransferLedgerLoading document={compatDocument} onClickCancel={goBack} />
    </TransferLedgerCosmosLoadingLayout>
  );
};

export default TransferLedgerCosmosLoadingContainer;
