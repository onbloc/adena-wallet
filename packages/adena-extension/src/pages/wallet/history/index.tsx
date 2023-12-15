import React from 'react';
import HistoryLayout from '@layouts/history-layout/history-layout';
import HistoryContainer from '@containers/history-container/history-container';

export const History = (): JSX.Element => {
  return <HistoryLayout history={<HistoryContainer />} />;
};
