import theme, { FontsType } from '@styles/theme';
import styled from 'styled-components';

interface TokenBalanceWrapperProps {
  orientation: 'VERTICAL' | 'HORIZONTAL';
  fontColor: string;
  fontStyleKey: FontsType;
  minimumFontSize: string;
}

export const TokenBalanceWrapper = styled.div<TokenBalanceWrapperProps>`
  display: flex;
  flex-direction: ${({ orientation }) => (orientation === 'HORIZONTAL' ? 'row' : 'column')};
  align-items: center;
  width: fit-content;
  height: auto;

  .denom-wrapper {
    display: inline-flex;
    margin-left: ${({ orientation }) => (orientation === 'HORIZONTAL' ? '3px' : '0')};

    .denom {
      display: contents;
      color: ${({ fontColor }) => fontColor};
      ${({ fontStyleKey }) => theme.fonts[fontStyleKey]};
      text-align: bottom;
    }
  }
`;
