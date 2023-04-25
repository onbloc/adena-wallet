import React from 'react';
import { TransferSummaryLayoutWrapper } from './transfer-summary-layout.styles';

export interface TransferSummaryLayoutProps {
  transferSummary: React.ReactNode;
}

const TransferSummaryLayout: React.FC<TransferSummaryLayoutProps> = ({ transferSummary }) => {
  return (
    <TransferSummaryLayoutWrapper>
      <div className='transfer-input-conatiner-wrppaer'>
        {transferSummary}
      </div>
    </TransferSummaryLayoutWrapper>
  );
};

export default TransferSummaryLayout;