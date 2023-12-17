import React from 'react';
import { TransferSummaryBalanceWrapper } from './transfer-summary-balance.styles';
import { TokenBalance } from '@components/molecules';

export interface TransferSummaryBalanceProps {
  tokenImage: string;
  value: string;
  denom: string;
}

const TransferSummaryBalance: React.FC<TransferSummaryBalanceProps> = ({
  tokenImage,
  value,
  denom,
}) => {
  return (
    <TransferSummaryBalanceWrapper>
      <img className='token-image' src={tokenImage} alt={'token image'} />
      <span className='balance'>
        <TokenBalance
          value={value}
          denom={denom}
          fontStyleKey='header5'
          minimumFontSize='16px'
          orientation='HORIZONTAL'
        />
      </span>
    </TransferSummaryBalanceWrapper>
  );
};

export default TransferSummaryBalance;
