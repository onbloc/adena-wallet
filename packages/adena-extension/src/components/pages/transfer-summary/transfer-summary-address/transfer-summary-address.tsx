import React, { useMemo } from 'react';
import { TransferSummaryAddressWrapper } from './transfer-summary-address.styles';

export interface TransferSummaryAddressProps {
  toAddress: string;
  memo: string;
}

const TransferSummaryAddress: React.FC<TransferSummaryAddressProps> = ({ toAddress, memo }) => {
  const memoMessage = useMemo(() => {
    const prefix = 'Memo:';
    if (!memo) {
      return `${prefix} (Empty)`;
    }

    return `${prefix} ${memo}`;
  }, [memo]);

  return (
    <TransferSummaryAddressWrapper>
      <div className='address-wrapper'>{toAddress}</div>
      <div className='memo-wrapper'>{memoMessage}</div>
    </TransferSummaryAddressWrapper>
  );
};

export default TransferSummaryAddress;
