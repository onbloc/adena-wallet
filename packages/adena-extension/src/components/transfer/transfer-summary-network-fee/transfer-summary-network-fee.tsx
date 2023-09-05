import React from 'react';
import { TransferSummaryNetworkFeeWrapper } from './transfer-summary-network-fee.styles';
import TokenBalance from '@components/common/token-balance/token-balance';

export interface TransferSummaryNetworkFeeProps {
  isError?: boolean;
  value: string;
  denom: string;
}

const TransferSummaryNetworkFee: React.FC<TransferSummaryNetworkFeeProps> = ({ isError, value, denom }) => {
  return (
    <TransferSummaryNetworkFeeWrapper isError={isError}>
      <span className='key'>{'Network Fee'}</span>
      <TokenBalance
        value={value}
        denom={denom}
        fontStyleKey='body2Reg'
        minimumFontSize='11px'
        orientation='HORIZONTAL'
      />
    </TransferSummaryNetworkFeeWrapper>
  );
};

export default TransferSummaryNetworkFee;