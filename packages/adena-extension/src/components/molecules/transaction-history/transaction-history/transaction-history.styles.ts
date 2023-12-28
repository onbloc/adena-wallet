import mixins from '@styles/mixins';
import styled from 'styled-components';

export const TransactionHistoryWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: 100%;

  & > div + div {
    margin-top: 24px;
  }
  overflow-y: auto;
`;

export const TransactionHistoryDescriptionWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: 100%;
  padding-top: 140px;

  text-align: center;
`;
