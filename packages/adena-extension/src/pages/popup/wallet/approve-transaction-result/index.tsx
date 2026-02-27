import React, { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import TransactionResult from '@components/molecules/transaction-result';
import { InjectionMessage } from '@inject/message';
import useAppNavigate from '@hooks/use-app-navigate';
import useLink from '@hooks/use-link';
import { RoutePath } from '@types';

const ApproveTransactionResult: React.FC = () => {
  const { navigate } = useAppNavigate();
  const { openScannerLink } = useLink();
  const location = useLocation();
  const response: InjectionMessage | undefined = location.state?.response;
  const isSuccess = response?.status === 'success';
  const failureErrorMessage = useMemo(() => {
    const error = response?.data?.error;

    if (!error) {
      return 'Unknown error';
    }

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error?.message === 'string') {
      return error.message;
    }

    return 'Unknown error';
  }, [response]);

  const onClickViewHistory = useCallback(() => {
    if (response) {
      chrome.runtime.sendMessage(response);
    }
    if (isSuccess) {
      navigate(RoutePath.History);
      return;
    }

    window.close();
  }, [response, navigate, isSuccess]);

  const onClickViewGnoscan = useCallback(() => {
    if (!response || response.status !== 'success') {
      return;
    }

    const txHash =
      response?.data?.hash ||
      response?.data?.txhash ||
      response?.data?.txHash ||
      response?.data?.transactionHash;

    if (!txHash || typeof txHash !== 'string') {
      return;
    }

    openScannerLink('/transactions/details', { txhash: txHash });
  }, [response, openScannerLink]);

  return (
    <TransactionResult
      status={isSuccess ? 'SUCCESS' : 'FAILED'}
      errorMessage={failureErrorMessage}
      onClickViewHistory={onClickViewHistory}
      onClickViewGnoscan={onClickViewGnoscan}
      onClickClose={onClickViewHistory}
    />
  );
};

export default ApproveTransactionResult;
