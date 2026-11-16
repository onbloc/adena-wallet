import React, { useMemo } from 'react';

import { formatAddress } from '@common/utils/client-utils';
import { TransferSummaryAddressWrapper } from './transfer-summary-address.styles';

export interface TransferSummaryAddressProps {
  toAddress: string;
  network?: string;
  memo: string;
}

const TransferSummaryAddress: React.FC<TransferSummaryAddressProps> = ({
  toAddress,
  network,
  memo,
}) => {
  const truncatedAddress = useMemo(() => formatAddress(toAddress, 6), [toAddress]);

  const memoText = memo?.trim() ? memo : '(Empty)';
  const isMemoEmpty = !memo?.trim();

  return (
    <TransferSummaryAddressWrapper>
      <div className='row'>
        <span className='label'>To</span>
        <span className='value'>{truncatedAddress}</span>
      </div>
      {network && (
        <div className='row'>
          <span className='label'>Network</span>
          <span className='value'>{network}</span>
        </div>
      )}
      <div className='row memo-row'>
        <span className='label'>Memo</span>
        <span className={`value memo-value ${isMemoEmpty ? 'memo-empty' : ''}`}>{memoText}</span>
      </div>
    </TransferSummaryAddressWrapper>
  );
};

export default TransferSummaryAddress;
