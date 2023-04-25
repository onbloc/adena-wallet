import React from 'react';
import { HistoryLayoutWrapper } from './history-layout.styles';

export interface HistoryLayoutProps {
  history: React.ReactNode;
}

const HistoryLayout: React.FC<HistoryLayoutProps> = ({ history }) => {
  return (
    <HistoryLayoutWrapper>
      <div className='title-wrapper'>
        <span className='title'>History</span>
      </div>
      <div className='transaction-history-wrapper'>
        {history}
      </div>
    </HistoryLayoutWrapper>
  );
};

export default HistoryLayout;