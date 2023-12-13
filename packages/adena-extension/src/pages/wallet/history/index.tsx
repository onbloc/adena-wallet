import React from 'react';
import styled, { FlattenSimpleInterpolation } from 'styled-components';
import HistoryContainer from './history-container';

const HistoryLayout = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  padding: 24px 20px;
  margin-bottom: 60px;

  .title-wrapper {
    margin-bottom: 12px;

    .title {
      ${({ theme }): FlattenSimpleInterpolation => theme.fonts.header4};
    }
  }
`;

export const History = (): JSX.Element => {
  return (
    <HistoryLayout>
      <div className='title-wrapper'>
        <span className='title'>History</span>
      </div>
      <div className='transaction-history-wrapper'>
        <HistoryContainer />
      </div>
    </HistoryLayout>
  );
};
