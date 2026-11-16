import React, { useCallback } from 'react';
import TransactionResult from '@components/molecules/transaction-result';

import useAppNavigate from '@hooks/use-app-navigate';
import useLink from '@hooks/use-link';
import { RoutePath } from '@types';

import IconSubmit from '@assets/submit.svg';

interface BroadcastMultisigTransactionResultProps {
  status: 'SUCCESS' | 'FAILED';
  txHash?: string | null;
  errorMessage?: string | null;
}

const BroadcastMultisigTransactionResult: React.FC<BroadcastMultisigTransactionResultProps> = ({
  status,
  txHash,
  errorMessage,
}) => {
  const { navigate } = useAppNavigate();
  const { openScannerLink } = useLink();

  const onClickViewHistory = useCallback(() => {
    navigate(RoutePath.History);
  }, [navigate]);

  const onClickViewGnoscan = useCallback(() => {
    if (!txHash) {
      return;
    }

    openScannerLink('/transactions/details', { txhash: txHash });
  }, [txHash, openScannerLink]);

  const onClickClose = useCallback(() => {
    navigate(RoutePath.Wallet);
  }, [navigate]);

  return (
    <TransactionResult
      status={status}
      errorMessage={errorMessage}
      onClickViewHistory={onClickViewHistory}
      onClickViewGnoscan={onClickViewGnoscan}
      onClickClose={onClickClose}
      successIconSrc={IconSubmit}
    />
  );
};

export default BroadcastMultisigTransactionResult;
