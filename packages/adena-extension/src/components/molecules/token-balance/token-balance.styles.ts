import { fonts, FontsType } from '@styles/theme';
import styled, { css, RuleSet } from 'styled-components';

interface TokenBalanceWrapperProps {
  orientation: 'VERTICAL' | 'HORIZONTAL';
  fontColor: string;
  fontStyleKey: FontsType;
  minimumFontSize: string;
  lineHeight?: string;
  maxWidth?: number;
}

export const TokenBalanceWrapper = styled.div.withConfig({
  shouldForwardProp: (prop): boolean =>
    ![
      'orientation',
      'fontColor',
      'fontStyleKey',
      'minimumFontSize',
      'lineHeight',
      'maxWidth',
    ].includes(prop),
})<TokenBalanceWrapperProps>`
  display: flex;
  flex-direction: ${({ orientation }): 'column' | 'row' =>
    orientation === 'HORIZONTAL' ? 'row' : 'column'};
  ${({ orientation, maxWidth }): RuleSet =>
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
  width: fit-content;
  height: auto;
  text-align: center;
  justify-content: center;
  align-items: flex-start;
  column-gap: 4px;

  .denom-wrapper {
    display: inline-flex;

    .denom {
      display: contents;
      color: ${({ fontColor }): string => fontColor};
      ${({ fontStyleKey }): RuleSet => fonts[fontStyleKey]};
      ${({ lineHeight }): RuleSet =>
        lineHeight
          ? css`
              line-height: ${lineHeight};
            `
          : css``};
    }
  }
`;
