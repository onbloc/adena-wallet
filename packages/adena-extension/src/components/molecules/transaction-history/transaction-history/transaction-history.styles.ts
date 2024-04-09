import mixins from '@styles/mixins';
import styled from 'styled-components';

export const TransactionHistoryWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: auto;

  & > div + div {
    margin-top: 24px;
  }
`;

export const TransactionHistoryDescriptionWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: auto;
  padding-top: 140px;

  text-align: center;
`;
