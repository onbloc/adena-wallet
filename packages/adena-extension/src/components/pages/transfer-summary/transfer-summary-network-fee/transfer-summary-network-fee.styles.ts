import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const TransferSummaryNetworkFeeWrapper = styled.div<{ isError?: boolean }>`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  padding: 14px 16px;
  background-color: ${getTheme('neutral', '_9')};
  border: 1px solid ${getTheme('neutral', '_7')};
  border-radius: 30px;
  ${({ isError, theme }): string | false | undefined => isError && `border-color: ${theme.red._5};`}

  .key {
    color: ${getTheme('neutral', 'a')};
    ${fonts.body2Reg};
  }
`;
