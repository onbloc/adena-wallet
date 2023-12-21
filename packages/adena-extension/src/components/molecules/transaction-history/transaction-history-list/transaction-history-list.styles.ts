import theme, { fonts } from '@styles/theme';
import styled from 'styled-components';

export const TransactionHistoryListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;

  & > .title {
    ${fonts.body1Reg};
    color: ${theme.color.neutral[9]};
  }

  & > .list-wrapper {
    margin-top: 12px;
  }
`;
