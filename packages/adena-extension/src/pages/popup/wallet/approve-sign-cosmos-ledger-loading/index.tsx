import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseType,
} from '@adena-wallet/sdk';
import { AdenaLedgerConnector, isLedgerAccount } from 'adena-module';
import React, { useEffect, useRef, useState } from 'react';

import { ApproveLedgerLoading } from '@components/molecules';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { InjectionMessage } from '@inject/message';
import { CosmosResponseExecuteType } from '@inject/types';
import { RoutePath } from '@types';

// Duplicated from approve-sign-cosmos/index.tsx and inject/message/methods/
// cosmos.ts because the SDK's `WalletMessageInfo` table still throws on
// Cosmos response types. Consolidate once the SDK catches up.
function createCosmosResponse(
  type: CosmosResponseExecuteType,
  status: 'success' | 'failure',
  key: string | undefined,
  data?: Record<string, unknown>,
  message = '',
): InjectionMessage {
  return {
    code: status === 'success' ? 0 : 1,
    key,
    type: type as unknown as WalletResponseType,
    status,
    message,
    data,
  };
}

const ApproveSignCosmosLedgerLoadingContainer: React.FC = () => {
  const { params } = useAppNavigate<RoutePath.ApproveSignCosmosLedgerLoading>();
  const { transactionService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const { signDoc, responseKey } = params;

  const [completed, setCompleted] = useState(false);
  // Prevent the retry loop from firing signRaw twice if the effect re-runs
  // while a request is already in flight on the device.
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
    // Mirror approve-sign-ledger-loading's retry cadence: transport hiccups
    // (app locked, cable jostled) surface as "Ledger …" errors and retry
    // after 1s. Terminal outcomes (success / user reject) flip `completed`
    // and break the loop.
    if (!done) {
      setTimeout(() => requestLedgerSign(), 1000);
    }
  };

  const signWithLedger = async (): Promise<boolean> => {
    if (!currentAccount || !signDoc) {
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
      const response = await transactionService.signCosmosAminoDocWithLedger(
        ledgerConnector,
        currentAccount,
        signDoc,
      );
      chrome.runtime.sendMessage(
        createCosmosResponse(CosmosResponseExecuteType.SIGN_COSMOS_AMINO, 'success', responseKey, {
          signed: response.signed,
          signature: response.signature,
        }),
      );
      window.close();
      return true;
    } catch (error) {
      const message = (error as Error)?.message ?? String(error);
      if (message === 'Transaction signing request was rejected by the user') {
        chrome.runtime.sendMessage(
          createCosmosResponse(
            CosmosResponseExecuteType.SIGN_COSMOS_AMINO,
            'failure',
            responseKey,
            undefined,
            WalletResponseRejectType.SIGN_REJECTED,
          ),
        );
        window.close();
        return true;
      }
      if (message.includes('Ledger')) {
        return false;
      }
      chrome.runtime.sendMessage(
        createCosmosResponse(
          CosmosResponseExecuteType.SIGN_COSMOS_AMINO,
          'failure',
          responseKey,
          { error: message },
          WalletResponseFailureType.UNEXPECTED_ERROR,
        ),
      );
      window.close();
      return true;
    }
  };

  const onClickCancel = (): void => {
    chrome.runtime.sendMessage(
      createCosmosResponse(
        CosmosResponseExecuteType.SIGN_COSMOS_AMINO,
        'failure',
        responseKey,
        undefined,
        WalletResponseRejectType.SIGN_REJECTED,
      ),
    );
    window.close();
  };

  return <ApproveLedgerLoading document={null} onClickCancel={onClickCancel} />;
};

export default ApproveSignCosmosLedgerLoadingContainer;
