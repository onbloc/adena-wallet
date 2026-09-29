import theme, { fonts } from '@styles/theme';
import styled, { css, RuleSet } from 'styled-components';

import { ChangeTone } from '@common/utils/price-utils';

export const changeToneColor = (tone: ChangeTone): string => {
  if (tone === 'positive') {
    return theme.green._5;
  }
  if (tone === 'negative') {
    return theme.red._5;
  }
  return theme.neutral.a;
};

export const TokenChangeRateWrapper = styled.span.withConfig({
  shouldForwardProp: (prop) => !['$tone', '$variant'].includes(prop),
})<{ $tone: ChangeTone; $variant: 'badge' | 'plain' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  ${fonts.captionReg};
  line-height: normal;
  color: ${({ $tone }): string => changeToneColor($tone)};

  ${({ $variant, $tone }): RuleSet | false =>
    $variant === 'badge' &&
    css`
      padding: 2px 3px;
      border-radius: 3px;
      /* 20% tint of the tone colour (hex alpha suffix keeps the theme token). */
      background-color: ${changeToneColor($tone)}33;
    `}
`;
