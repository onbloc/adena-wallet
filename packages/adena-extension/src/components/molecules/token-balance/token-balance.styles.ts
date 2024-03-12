import { FontsType, fonts } from '@styles/theme';
import styled, { css, FlattenSimpleInterpolation } from 'styled-components';

interface TokenBalanceWrapperProps {
  orientation: 'VERTICAL' | 'HORIZONTAL';
  fontColor: string;
  fontStyleKey: FontsType;
  minimumFontSize: string;
  lineHeight?: string;
}

export const TokenBalanceWrapper = styled.div<TokenBalanceWrapperProps>`
  display: flex;
  flex-direction: ${({ orientation }): 'column' | 'row' =>
    orientation === 'HORIZONTAL' ? 'row' : 'column'};
  align-items: center;
  width: fit-content;
  height: auto;

  .denom-wrapper {
    display: inline-flex;
    margin-left: ${({ orientation }): '3px' | '0' => (orientation === 'HORIZONTAL' ? '3px' : '0')};

    .denom {
      display: contents;
      color: ${({ fontColor }): string => fontColor};
      ${({ fontStyleKey }): FlattenSimpleInterpolation => fonts[fontStyleKey]};
      ${({ lineHeight }): FlattenSimpleInterpolation =>
        lineHeight
          ? css`
              line-height: ${lineHeight};
            `
          : css`sd`};
    }
  }
`;
