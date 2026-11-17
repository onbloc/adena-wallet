import { css, DefaultTheme, RuleSet } from 'styled-components';

import {
  colorTokens,
  FontToken,
  fontTokens,
  FontsType,
  webFontTokens,
  WebFontType,
} from './tokens';

export type { FontsType, WebFontType } from './tokens';

const toCss = ({ fontSize, fontWeight, lineHeight, letterSpacing, uppercase }: FontToken): RuleSet =>
  css`
    font-size: ${fontSize}px;
    font-weight: ${fontWeight};
    line-height: ${lineHeight}px;
    ${letterSpacing !== undefined ? `letter-spacing: ${letterSpacing}px;` : ''}
    ${uppercase ? 'text-transform: uppercase;' : ''}
  `;

const mapFonts = <K extends string>(tokens: Record<K, FontToken>): Record<K, RuleSet> =>
  Object.fromEntries(
    Object.entries<FontToken>(tokens).map(([name, token]) => [name, toCss(token)]),
  ) as Record<K, RuleSet>;

export const webFonts: Record<WebFontType, RuleSet> = mapFonts(webFontTokens);

export const fonts: Record<FontsType, RuleSet> = mapFonts(fontTokens);

type ThemeType = typeof theme;

const theme = colorTokens;

export const getTheme =
  <T1 extends keyof DefaultTheme, T2 extends keyof DefaultTheme[T1]>(val1: T1, val2: T2) =>
  ({ theme }: { theme: DefaultTheme }): DefaultTheme[T1][T2] =>
    theme[val1][val2];

export default theme;

declare module 'styled-components' {
  export interface DefaultTheme extends ThemeType {}
}
