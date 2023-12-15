import theme, { FontsType } from '@styles/theme';
import styled, { FlattenSimpleInterpolation } from 'styled-components';

interface HighlightNumberWrapperProps {
  fontColor: string;
  fontStyleKey: FontsType;
  minimumFontSize: string;
}

export const HighlightNumberWrapper = styled.div<HighlightNumberWrapperProps>`
  display: flex;
  flex-direction: row;
  width: fit-content;
  height: auto;
  vertical-align: top;

  .value {
    display: contents;
    ${({ fontStyleKey }): FlattenSimpleInterpolation => theme.fonts[fontStyleKey]};
    color: ${({ fontColor }): string => fontColor};
    text-align: bottom;

    &.decimal {
      font-size: ${({ minimumFontSize }): string => minimumFontSize};
    }
  }
`;
