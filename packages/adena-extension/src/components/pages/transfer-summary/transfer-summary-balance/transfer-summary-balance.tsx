import FeeAmount from '@components/molecules/fee-amount/fee-amount';
import { FeeTokenQuote } from '@hooks/wallet/use-fee-token-price';
import React from 'react';
import { TransferSummaryBalanceWrapper } from './transfer-summary-balance.styles';

export interface TransferSummaryBalanceProps {
  tokenImage: string;
  value: string;
  denom: string;
  tokenName: string;
  chainBadgeImage?: string;
  /** Quote for the token being sent; adds its USD value beside the amount. */
  tokenQuote?: FeeTokenQuote | null;
}

const TransferSummaryBalance: React.FC<TransferSummaryBalanceProps> = ({
  tokenImage,
  value,
  denom,
  tokenName,
  chainBadgeImage,
  tokenQuote,
}) => {
  return (
    <TransferSummaryBalanceWrapper>
      <div className='token-icon-wrapper'>
        <img className='token-image' src={tokenImage} alt='token image' />
        {chainBadgeImage && (
          <img className='chain-badge' src={chainBadgeImage} alt='chain badge' />
        )}
      </div>
      <span className='chain-name'>{tokenName}</span>
      <div className='balance-wrapper'>
        {/* Same layout as the network fee row: `1.5 GNOT ($0.42)`. */}
        <FeeAmount
          className='transfer-amount'
          value={value}
          denom={denom}
          quote={tokenQuote}
        />
      </div>
    </TransferSummaryBalanceWrapper>
  );
};

export default TransferSummaryBalance;
