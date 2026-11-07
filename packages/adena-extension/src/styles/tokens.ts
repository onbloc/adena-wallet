/**
 * Design tokens: plain colour and typography values with no styling library
 * attached. The extension builds its styled-components theme from these, and
 * the React Native app reads the same file, so both stay on one palette.
 */

export const colorTokens = {
  neutral: {
    _1: '#FFFFFF',
    _2: '#E7E8F3',
    _3: '#A3A3B5',
    _4: '#646486',
    _5: '#52526B',
    _6: '#39394E',
    _7: '#32323D',
    _8: '#212128',
    _9: '#191920',
    a: '#777777',
    b: '#454554',
  },
  primary: {
    _1: '#0059ff29',
    _2: '#ADCAFF',
    _3: '#B0CCFF',
    _4: '#78A7FF',
    _5: '#377DFF',
    _6: '#0059FF',
    _7: '#0043C1',
    _8: '#003290',
    _9: '#001D52',
  },
  red: {
    _3: '#FFA59F',
    _4: '#FF7B73',
    _5: '#EF2D21',
    _6: '#D6160A',
    _7: '#BB0B00',
    _8: '#FB923C',
    a: '#E7323B',
    b: '#B62E29',
  },
  green: {
    _3: '#7DEECC',
    _4: '#5ADAB3',
    _5: '#0DBE89',
    _6: '#09A375',
    _7: '#057E5A',
  },
  webNeutral: {
    _0: '#FFFFFF',
    _100: '#FAFCFF',
    _200: '#CED8EB',
    _300: '#BCC5D6',
    _400: '#A2A9B8',
    _500: '#878D99',
    _600: '#6C717A',
    _700: '#51555C',
    _800: '#36383D',
    _900: '#101214',
  },
  webPrimary: {
    _100: '#0059FF',
  },
  webBase: {
    _100: '#0C0D0F',
  },
  webInput: {
    _100: '#181B1F',
  },
  webError: {
    _100: '#EB545E',
    _200: '#5C2125',
    _300: '#1A1112',
  },
  webSuccess: {
    _100: '#11D695',
    _200: '#113D2F',
    _300: '#111A17',
  },
  webWarning: {
    _100: '#FBC224',
  },
} as const;

export type ColorTokens = typeof colorTokens;

export interface FontToken {
  /** px */
  fontSize: number;
  fontWeight: 300 | 400 | 500 | 600 | 700;
  /** px */
  lineHeight: number;
  /** px */
  letterSpacing?: number;
  uppercase?: boolean;
}

/** Popup (extension) type scale. */
export const fontTokens = {
  header1: { fontWeight: 700, fontSize: 48, lineHeight: 72 },
  header2: { fontWeight: 700, fontSize: 32, lineHeight: 48 },
  header3: { fontWeight: 700, fontSize: 28, lineHeight: 42 },
  header4: { fontWeight: 700, fontSize: 24, lineHeight: 33.6 },
  header5: { fontWeight: 700, fontSize: 20, lineHeight: 30 },
  header6: { fontWeight: 700, fontSize: 18, lineHeight: 27 },
  header7: { fontWeight: 700, fontSize: 14, lineHeight: 21 },
  body1Bold: { fontWeight: 600, fontSize: 16, lineHeight: 24 },
  body1Reg: { fontWeight: 400, fontSize: 16, lineHeight: 24 },
  body2Bold: { fontWeight: 600, fontSize: 14, lineHeight: 21 },
  body2Reg: { fontWeight: 400, fontSize: 14, lineHeight: 21 },
  body3Bold: { fontWeight: 600, fontSize: 12, lineHeight: 21 },
  body3Reg: { fontWeight: 400, fontSize: 12, lineHeight: 21 },
  body4Bold: { fontWeight: 600, fontSize: 10, lineHeight: 15 },
  body4Reg: { fontWeight: 400, fontSize: 10, lineHeight: 15 },
  title1: { fontWeight: 500, fontSize: 25, lineHeight: 30 },
  captionBold: { fontWeight: 700, fontSize: 11, lineHeight: 18 },
  captionReg: { fontWeight: 400, fontSize: 11, lineHeight: 18 },
  light1Bold: { fontWeight: 700, fontSize: 10, lineHeight: 18 },
  light1Reg: { fontWeight: 400, fontSize: 10.5, lineHeight: 18 },
  bold13: { fontWeight: 600, fontSize: 13, lineHeight: 19.5 },
  light13: { fontWeight: 400, fontSize: 13, lineHeight: 19.5 },
  light11: { fontWeight: 300, fontSize: 11, lineHeight: 16 },
} satisfies Record<string, FontToken>;

/** Web (onboarding / full page) type scale. */
export const webFontTokens = {
  title1: { fontSize: 24, fontWeight: 600, lineHeight: 32, letterSpacing: -0.48 },
  title2: { fontSize: 20, fontWeight: 600, lineHeight: 28, letterSpacing: -0.4 },
  title3: { fontSize: 18, fontWeight: 600, lineHeight: 24, letterSpacing: -0.36 },
  title4: { fontSize: 16, fontWeight: 600, lineHeight: 22, letterSpacing: -0.32 },
  title5: { fontSize: 14, fontWeight: 600, lineHeight: 18, letterSpacing: -0.28 },
  title6: { fontSize: 12, fontWeight: 600, lineHeight: 16, letterSpacing: -0.24 },
  titleOverline1: {
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 20,
    letterSpacing: 1.28,
    uppercase: true,
  },
  titleOverline2: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 18,
    letterSpacing: 1.12,
    uppercase: true,
  },
  titleOverline3: {
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 14,
    letterSpacing: 0.96,
    uppercase: true,
  },
  body1: { fontSize: 24, fontWeight: 400, lineHeight: 32, letterSpacing: -0.48 },
  body2: { fontSize: 20, fontWeight: 400, lineHeight: 28, letterSpacing: -0.4 },
  body3: { fontSize: 18, fontWeight: 400, lineHeight: 26, letterSpacing: -0.36 },
  body4: { fontSize: 16, fontWeight: 400, lineHeight: 24, letterSpacing: -0.32 },
  body5: { fontSize: 14, fontWeight: 400, lineHeight: 20, letterSpacing: -0.28 },
  body6: { fontSize: 12, fontWeight: 400, lineHeight: 16, letterSpacing: -0.24 },
  headline1: { fontSize: 40, fontWeight: 600, lineHeight: 48, letterSpacing: -0.8 },
  headline2: { fontSize: 36, fontWeight: 600, lineHeight: 44, letterSpacing: -0.72 },
  headline3: { fontSize: 32, fontWeight: 600, lineHeight: 40, letterSpacing: -0.64 },
  headline4: { fontSize: 28, fontWeight: 600, lineHeight: 32, letterSpacing: -0.56 },
  display1: { fontSize: 72, fontWeight: 600, lineHeight: 84, letterSpacing: -2.16 },
  display2: { fontSize: 64, fontWeight: 600, lineHeight: 72, letterSpacing: -1.92 },
  display3: { fontSize: 56, fontWeight: 600, lineHeight: 68, letterSpacing: -1.68 },
  display4: { fontSize: 48, fontWeight: 600, lineHeight: 60, letterSpacing: -1.44 },
  display5: { fontSize: 44, fontWeight: 600, lineHeight: 52, letterSpacing: -1.32 },
} satisfies Record<string, FontToken>;

export type FontsType = keyof typeof fontTokens;
export type WebFontType = keyof typeof webFontTokens;
