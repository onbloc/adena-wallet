import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const TransactionHistoryListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;

  & > .title {
    ${fonts.body1Reg};
    color: ${getTheme('neutral', 'a')};
  }

  & > .list-wrapper {
    margin-top: 12px;
  }
`;
