import { fonts, FontsType } from '@styles/theme';
import styled, { css, FlattenSimpleInterpolation } from 'styled-components';

interface TokenBalanceWrapperProps {
  orientation: 'VERTICAL' | 'HORIZONTAL';
  fontColor: string;
  fontStyleKey: FontsType;
  minimumFontSize: string;
  lineHeight?: string;
  maxWidth?: number;
}

export const TokenBalanceWrapper = styled.div<TokenBalanceWrapperProps>`
  display: flex;
  flex-direction: ${({ orientation }): 'column' | 'row' =>
    orientation === 'HORIZONTAL' ? 'row' : 'column'};
  ${({ orientation, maxWidth }): FlattenSimpleInterpolation =>
    orientation === 'HORIZONTAL'
      ? css`
          flex-direction: row;
        `
      : maxWidth
        ? css`
            flex-flow: row wrap;
            max-width: ${maxWidth}px;
          `
        : css`
            flex-direction: column;
          `}
  align-items: center;
  width: fit-content;
  height: auto;
  text-align: center;
  justify-content: center;
  column-gap: 4px;

  .denom-wrapper {
    display: inline-flex;

    .denom {
      display: contents;
      color: ${({ fontColor }): string => fontColor};
      ${({ fontStyleKey }): FlattenSimpleInterpolation => fonts[fontStyleKey]};
      ${({ lineHeight }): FlattenSimpleInterpolation =>
        lineHeight
          ? css`
              line-height: ${lineHeight};
            `
          : css``};
    }
  }
`;
