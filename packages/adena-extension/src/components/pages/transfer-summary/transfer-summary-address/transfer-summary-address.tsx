import React from 'react';
import { TransferSummaryAddressWrapper } from './transfer-summary-address.styles';

export interface TransferSummaryAddressProps {
  toAddress: string;
}

const TransferSummaryAddress: React.FC<TransferSummaryAddressProps> = ({ toAddress }) => {
  return (
    <TransferSummaryAddressWrapper>
      {toAddress}
    </TransferSummaryAddressWrapper>
  );
};

export default TransferSummaryAddress;