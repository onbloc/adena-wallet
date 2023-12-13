import React from 'react';
import TransferSummaryLayout from '@layouts/transfer-summary-layout/transfer-summary-layout';
import TransferSummaryContainer from './transfer-summary-container';

const TransferSummary: React.FC = () => {
  return <TransferSummaryLayout transferSummary={<TransferSummaryContainer />} />;
};

export default TransferSummary;
