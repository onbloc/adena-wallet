import React from 'react';
import { TransferSummaryAddressWrapper } from './transfer-summary-address.styles';

export interface TransferSummaryAddressProps {
  toAddress: string;
  memo: string;
}

const TransferSummaryAddress: React.FC<TransferSummaryAddressProps> = ({ toAddress, memo }) => {
  return (
    <TransferSummaryAddressWrapper>
      <div className='address-wrapper'>{toAddress}</div>
      <div className='memo-wrapper'>{memo}</div>
    </TransferSummaryAddressWrapper>
  );
};

export default TransferSummaryAddress;
