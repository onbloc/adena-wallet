import { css, DefaultTheme, FlattenSimpleInterpolation } from 'styled-components';

export enum Neutral {
  _1 = '#FFFFFF',
  _2 = '#E7E8F3',
  _3 = '#A3A3B5',
  _4 = '#646486',
  _5 = '#52526B',
  _6 = '#39394E',
  _7 = '#32323D',
  _8 = '#212128',
  _9 = '#191920',
  a = '#777777',
  b = '#454554',
}

export enum Primary {
  _3 = '#B0CCFF',
  _4 = '#78A7FF',
  _5 = '#377DFF',
  _6 = '#0059FF',
  _7 = '#0043C1',
  _8 = '#003290',
  _9 = '#001D52',
}

export enum Red {
  _3 = '#FFA59F',
  _4 = '#FF7B73',
  _5 = '#EF2D21',
  _6 = '#D6160A',
  _7 = '#BB0B00',
  a = '#E7323B',
  b = '#B62E29',
}

export enum Green {
  _3 = '#7DEECC',
  _4 = '#5ADAB3',
  _5 = '#0DBE89',
  _6 = '#09A375',
  _7 = '#057E5A',
}

export const fonts: FontsKeyType = {
  header1: css`
    font-weight: 700;
    font-size: 48px;
    line-height: 72px;
  `,
  header2: css`
    font-weight: 700;
    font-size: 32px;
    line-height: 48px;
  `,
  header3: css`
    font-weight: 700;
    font-size: 28px;
    line-height: 42px;
  `,
  header4: css`
    font-weight: 700;
    font-size: 24px;
    line-height: 33.6px;
  `,
  header5: css`
    font-weight: 700;
    font-size: 20px;
    line-height: 30px;
  `,
  header6: css`
    font-weight: 700;
    font-size: 18px;
    line-height: 27px;
  `,
  header7: css`
    font-weight: 700;
    font-size: 14px;
    line-height: 21px;
  `,
  body1Bold: css`
    font-weight: 600;
    font-size: 16px;
    line-height: 24px;
  `,
  body1Reg: css`
    font-weight: 400;
    font-size: 16px;
    line-height: 24px;
  `,
  body2Bold: css`
    font-weight: 600;
    font-size: 14px;
    line-height: 21px;
  `,
  body2Reg: css`
    font-weight: 400;
    font-size: 14px;
    line-height: 21px;
  `,
  body3Bold: css`
    font-weight: 600;
    font-size: 12px;
    line-height: 21px;
  `,
  body3Reg: css`
    font-weight: 400;
    font-size: 12px;
    line-height: 21px;
  `,
  body4Bold: css`
    font-weight: 600;
    font-size: 10px;
    line-height: 15px;
  `,
  body4Reg: css`
    font-weight: 400;
    font-size: 10px;
    line-height: 15px;
  `,
  title1: css`
    font-weight: 500;
    font-size: 25px;
    line-height: 30px;
  `,
  captionBold: css`
    font-weight: 700;
    font-size: 11px;
    line-height: 18px;
  `,
  captionReg: css`
    font-weight: 400;
    font-size: 11px;
    line-height: 18px;
  `,
  light1Reg: css`
    font-weight: 400;
    font-size: 10.5px;
    line-height: 18px;
  `,
  light13: css`
    font-weight: 400;
    font-size: 13px;
    line-height: 19.5px;
  `,
  light11: css`
    font-weight: 300;
    font-size: 11px;
    line-height: 16px;
  `,
} as const;

export type FontsType =
  | 'header1'
  | 'header2'
  | 'header3'
  | 'header4'
  | 'header5'
  | 'header6'
  | 'header7'
  | 'body1Bold'
  | 'body1Reg'
  | 'body2Bold'
  | 'body2Reg'
  | 'body3Bold'
  | 'body3Reg'
  | 'body4Bold'
  | 'body4Reg'
  | 'title1'
  | 'captionBold'
  | 'captionReg'
  | 'light1Reg'
  | 'light13'
  | 'light11';

type FontsKeyType = { [key in FontsType]: FlattenSimpleInterpolation };

type ThemeType = typeof theme;

const theme = {
  neutral: Neutral,
  primary: Primary,
  red: Red,
  green: Green,
};

export const getTheme =
  <T1 extends keyof DefaultTheme, T2 extends keyof DefaultTheme[T1]>(val1: T1, val2: T2) =>
  ({ theme }: { theme: DefaultTheme }): DefaultTheme[T1][T2] =>
    theme[val1][val2];

export default theme;

declare module 'styled-components' {
  export interface DefaultTheme extends ThemeType {}
}
