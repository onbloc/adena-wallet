import mixins from '@styles/mixins';
import { fonts, FontsType } from '@styles/theme';
import styled, { css, RuleSet } from 'styled-components';

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

    ${({ fontStyleKey }): RuleSet => fonts[fontStyleKey]};
    ${({ lineHeight }): RuleSet =>
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
