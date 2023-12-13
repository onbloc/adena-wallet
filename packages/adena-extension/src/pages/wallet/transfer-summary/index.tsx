import React from 'react';
import styled from 'styled-components';
import TransferSummaryContainer from './transfer-summary-container';

const TransferSummaryLayout = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  padding: 24px 20px;
`;

const TransferSummary: React.FC = () => {
  return (
    <TransferSummaryLayout>
      <div>
        <TransferSummaryContainer />
      </div>
    </TransferSummaryLayout>
  );
};

export default TransferSummary;
