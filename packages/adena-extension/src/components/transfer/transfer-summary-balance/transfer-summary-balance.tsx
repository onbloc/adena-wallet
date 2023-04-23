import React from 'react';
import { TransferSummaryBalanceWrapper } from './transfer-summary-balance.styles';

export interface TransferSummaryBalanceProps {
  tokenImage: string;
  transferBalance: string;
}

const TransferSummaryBalance: React.FC<TransferSummaryBalanceProps> = ({
  tokenImage,
  transferBalance
}) => {
  return (
    <TransferSummaryBalanceWrapper>
      <img className='token-image' src={tokenImage} alt={'token image'} />
      <span className='balance'>{transferBalance}</span>
    </TransferSummaryBalanceWrapper>
  );
};

export default TransferSummaryBalance;