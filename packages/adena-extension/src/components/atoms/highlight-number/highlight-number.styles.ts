import styled, { css, FlattenSimpleInterpolation } from 'styled-components';
import mixins from '@styles/mixins';
import { FontsType, fonts } from '@styles/theme';

interface HighlightNumberWrapperProps {
  fontColor: string;
  fontStyleKey: FontsType;
  minimumFontSize: string;
  lineHeight?: string;
}

export const HighlightNumberWrapper = styled.div<HighlightNumberWrapperProps>`
  ${mixins.flex({ direction: 'row', align: 'normal', justify: 'normal' })};
  width: fit-content;
  height: auto;

  .value {
    display: contents;
    color: ${({ fontColor }): string => fontColor};
    text-align: bottom;

    ${({ fontStyleKey }): FlattenSimpleInterpolation => fonts[fontStyleKey]};
    ${({ lineHeight }): FlattenSimpleInterpolation =>
      lineHeight
        ? css`
            line-height: ${lineHeight};
          `
        : css``};

    &.decimal {
      font-size: ${({ minimumFontSize }): string => minimumFontSize};
    }
  }
`;
