import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const TransferSummaryNetworkFeeWrapper = styled.div<{ isError?: boolean }>`
  display: flex;
  flex-direction: row;
  width: 100%;
  padding: 14px 16px;
  background-color: ${getTheme('neutral', '_9')};
  border: 1px solid ${getTheme('neutral', '_7')};
  border-radius: 30px;
  justify-content: space-between;
  align-items: center;
  ${({ isError, theme }): string | false | undefined => isError && `border-color: ${theme.red._5};`}

  .key {
    color: ${getTheme('neutral', 'a')};
    ${fonts.body2Reg};
  }
`;
