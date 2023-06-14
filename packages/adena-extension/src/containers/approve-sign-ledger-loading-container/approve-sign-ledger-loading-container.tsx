import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { StdSignDoc, isLedgerAccount } from 'adena-module';
import ApproveLedgerLoading from '@components/approve/approve-ledger-loading/approve-ledger-loading';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useGnoClient } from '@hooks/use-gno-client';
import { useAdenaContext } from '@hooks/use-context';

interface ApproveSignLedgerLoadingState {
  requestData?: InjectionMessage;
  document?: StdSignDoc;
}

const ApproveSignLedgerLoadingContainer: React.FC = () => {
  const location = useLocation();
  const { transactionService } = useAdenaContext();
  const { document, requestData } = location.state as ApproveSignLedgerLoadingState;
  const { currentAccount } = useCurrentAccount();
  const [gnoClient] = useGnoClient();
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (currentAccount) {
      requestTransaction();
    }
  }, [currentAccount]);

  const requestTransaction = async () => {
    if (completed) {
      return;
    }
    const result = await createLedgerTransaction();
    setCompleted(result);
    setTimeout(() => !result && requestTransaction(), 1000);
  };

  const createLedgerTransaction = async () => {
    if (!currentAccount || !gnoClient || !document) {
      return false;
    }

    if (!isLedgerAccount(currentAccount)) {
      return false;
    }

    const result = await transactionService.createSignatureWithLedger(currentAccount, document).then(async (signature) => {
      chrome.runtime.sendMessage(
        InjectionMessageInstance.success('SIGN_AMINO', { document, signature }, requestData?.key),
      );
      return true;
    }).catch((error: Error) => {
      if (error.message === 'Transaction signing request was rejected by the user') {
        chrome.runtime.sendMessage(
          InjectionMessageInstance.failure('SIGN_REJECTED', requestData?.data, requestData?.key),
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

  const onClickCancel = () => {
    if (!requestData) {
      window.close();
      return;
    }
    chrome.runtime.sendMessage(
      InjectionMessageInstance.failure('SIGN_REJECTED', requestData.data, requestData.key),
    );
  }

  return (
    <ApproveLedgerLoading
      onClickCancel={onClickCancel}
    />
  );
};

export default ApproveSignLedgerLoadingContainer;