import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseType,
} from '@adena-wallet/sdk';
import { AdenaLedgerConnector, isLedgerAccount, LedgerError } from 'adena-module';
import React, { useEffect, useRef, useState } from 'react';

import { ApproveLedgerLoading } from '@components/molecules';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { SignArbitraryExecuteType } from '@inject/types';
import { RoutePath } from '@types';

// Duplicated from approve-sign-arbitrary/index.tsx for the same reason the
// Cosmos pages duplicate theirs: the SDK's `WalletMessageInfo` still throws on
// this response type. Consolidate once the SDK catches up.
function createSignArbitraryResponse(
  status: 'success' | 'failure',
  key: string | undefined,
  data?: Record<string, unknown>,
  message = '',
): InjectionMessage {
  return {
    code: status === 'success' ? 0 : 1,
    key,
    type: SignArbitraryExecuteType.SIGN_ARBITRARY as unknown as WalletResponseType,
    status,
    message,
    data,
  };
}

const ApproveSignArbitraryLedgerLoadingContainer: React.FC = () => {
  const { params } = useAppNavigate<RoutePath.ApproveSignArbitraryLedgerLoading>();
  const { transactionService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const { chainId, signer, data, responseKey } = params;

  const [completed, setCompleted] = useState(false);
  // Stops the retry loop firing a second request at the device while one is
  // already in flight.
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!currentAccount || completed) {
      return;
    }
    requestLedgerSign();
  }, [currentAccount]);

  const requestLedgerSign = async (): Promise<void> => {
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    const done = await signWithLedger();
    inFlightRef.current = false;
    setCompleted(done);
    // Mirrors the other Ledger loading pages: transport hiccups (app locked,
    // cable jostled) surface as errors and retry after a second, while terminal
    // outcomes flip `completed` and break the loop.
    if (!done) {
      setTimeout(() => requestLedgerSign(), 1000);
    }
  };

  const signWithLedger = async (): Promise<boolean> => {
    if (!currentAccount || !chainId || !signer || !data) {
      return false;
    }
    if (!isLedgerAccount(currentAccount)) {
      return false;
    }

    const connected = await AdenaLedgerConnector.openConnected();
    if (!connected) {
      return false;
    }
    const ledgerConnector = AdenaLedgerConnector.fromTransport(connected);

    try {
      const response = await transactionService.signArbitraryDocWithLedger(
        ledgerConnector,
        currentAccount,
        chainId,
        signer,
        data,
      );
      chrome.runtime.sendMessage(
        createSignArbitraryResponse('success', responseKey, { ...response }),
      );
      window.close();
      return true;
    } catch (error) {
      const message = (error as Error)?.message ?? String(error);
      if (message === 'Transaction signing request was rejected by the user') {
        chrome.runtime.sendMessage(
          InjectionMessageInstance.failure(WalletResponseRejectType.SIGN_REJECTED, {}, responseKey),
        );
        window.close();
        return true;
      }
      // A device holding a different seed never succeeds on retry, so answer
      // the request rather than re-prompting it every second.
      if (error instanceof LedgerError && error.kind === 'AccountMismatch') {
        chrome.runtime.sendMessage(
          createSignArbitraryResponse(
            'failure',
            responseKey,
            { error: message },
            WalletResponseFailureType.ACCOUNT_MISMATCH,
          ),
        );
        window.close();
        return true;
      }
      return false;
    }
  };

  const onClickCancel = (): void => {
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure(WalletResponseRejectType.SIGN_REJECTED, {}, responseKey),
    );
    window.close();
  };

  return <ApproveLedgerLoading document={null} onClickCancel={onClickCancel} />;
};

export default ApproveSignArbitraryLedgerLoadingContainer;
