import TransactionResult from '@components/molecules/transaction-result';
import React from 'react';

interface ApproveTransactionResultProps {
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string | null;
  onClickViewHistory: () => void;
  onClickViewGnoscan: () => void;
  onClickClose: () => void;
}

const ApproveTransactionResult: React.FC<ApproveTransactionResultProps> = ({
  status,
  errorMessage,
  onClickViewHistory,
  onClickViewGnoscan,
  onClickClose,
}) => {
  return (
    <TransactionResult
      status={status}
      successButtonText={'Close'}
      errorMessage={errorMessage}
      onClickViewHistory={onClickViewHistory}
      onClickViewGnoscan={onClickViewGnoscan}
      onClickClose={onClickClose}
    />
  );
};

export default ApproveTransactionResult;
