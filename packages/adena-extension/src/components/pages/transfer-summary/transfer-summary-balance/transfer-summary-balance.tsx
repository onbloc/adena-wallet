import { TokenBalance } from '@components/molecules';
import React from 'react';
import { TransferSummaryBalanceWrapper } from './transfer-summary-balance.styles';

export interface TransferSummaryBalanceProps {
  tokenImage: string;
  value: string;
  denom: string;
  chainName: string;
  chainBadgeImage?: string;
}

const TransferSummaryBalance: React.FC<TransferSummaryBalanceProps> = ({
  tokenImage,
  value,
  denom,
  chainName,
  chainBadgeImage,
}) => {
  return (
    <TransferSummaryBalanceWrapper>
      <div className='token-icon-wrapper'>
        <img className='token-image' src={tokenImage} alt='token image' />
        {chainBadgeImage && (
          <img className='chain-badge' src={chainBadgeImage} alt='chain badge' />
        )}
      </div>
      <span className='chain-name'>{chainName}</span>
      <div className='balance-wrapper'>
        <TokenBalance
          value={value}
          denom={denom}
          fontStyleKey='body2Reg'
          minimumFontSize='11px'
          orientation='HORIZONTAL'
        />
      </div>
    </TransferSummaryBalanceWrapper>
  );
};

export default TransferSummaryBalance;
