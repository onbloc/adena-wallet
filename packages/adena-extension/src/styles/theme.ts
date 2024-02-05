import { css, DefaultTheme, FlattenSimpleInterpolation } from 'styled-components';

enum WebNeutral {
  _0 = '#FFFFFF',
  _100 = '#FAFCFF',
  _200 = '#CED8EB',
  _300 = '#BCC5D6',
  _400 = '#A2A9B8',
  _500 = '#878D99',
  _600 = '#6C717A',
  _700 = '#51555C',
  _800 = '#36383D',
  _900 = '#101214',
}

enum WebPrimary {
  _100 = '#0059FF',
}

enum WebBase {
  _100 = '#0C0D0F',
}

enum WebInput {
  _100 = '#181B1F',
}

enum WebError {
  _100 = '#EB545E',
  _200 = '#5C2125',
  _300 = '#1A1112',
}

enum WebSuccess {
  _100 = '#11D695',
  _200 = '#113D2F',
  _300 = '#111A17',
}

enum WebWarning {
  _100 = '#FBC224',
}

enum Neutral {
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

enum Primary {
  _3 = '#B0CCFF',
  _4 = '#78A7FF',
  _5 = '#377DFF',
  _6 = '#0059FF',
  _7 = '#0043C1',
  _8 = '#003290',
  _9 = '#001D52',
}

enum Red {
  _3 = '#FFA59F',
  _4 = '#FF7B73',
  _5 = '#EF2D21',
  _6 = '#D6160A',
  _7 = '#BB0B00',
  a = '#E7323B',
  b = '#B62E29',
}

enum Green {
  _3 = '#7DEECC',
  _4 = '#5ADAB3',
  _5 = '#0DBE89',
  _6 = '#09A375',
  _7 = '#057E5A',
}

export type WebFontType =
  | 'title1'
  | 'title2'
  | 'title3'
  | 'title4'
  | 'title5'
  | 'title6'
  | 'titleOverline1'
  | 'titleOverline2'
  | 'titleOverline3'
  | 'body1'
  | 'body2'
  | 'body3'
  | 'body4'
  | 'body5'
  | 'body6'
  | 'headline1'
  | 'headline2'
  | 'headline3'
  | 'headline4'
  | 'display1'
  | 'display2'
  | 'display3'
  | 'display4'
  | 'display5';

export const webFonts: Record<WebFontType, FlattenSimpleInterpolation> = {
  title1: css`
    font-size: 24px;
    font-weight: 600;
    line-height: 32px; /* 133.333% */
    letter-spacing: -0.48px;
  `,
  title2: css`
    font-size: 20px;
    font-weight: 600;
    line-height: 28px; /* 140% */
    letter-spacing: -0.4px;
  `,
  title3: css`
    font-size: 18px;
    font-weight: 600;
    line-height: 24px; /* 133.333% */
    letter-spacing: -0.36px;
  `,
  title4: css`
    font-size: 16px;
    font-weight: 600;
    line-height: 22px; /* 137.5% */
    letter-spacing: -0.32px;
  `,
  title5: css`
    font-size: 14px;
    font-weight: 600;
    line-height: 18px; /* 128.571% */
    letter-spacing: -0.28px;
  `,
  title6: css`
    font-size: 12px;
    font-weight: 600;
    line-height: 16px; /* 133.333% */
    letter-spacing: -0.24px;
  `,
  titleOverline1: css`
    font-size: 16px;
    font-weight: 600;
    line-height: 20px; /* 125% */
    letter-spacing: 1.28px;
    text-transform: uppercase;
  `,
  titleOverline2: css`
    font-size: 14px;
    font-weight: 600;
    line-height: 18px; /* 128.571% */
    letter-spacing: 1.12px;
    text-transform: uppercase;
  `,
  titleOverline3: css`
    font-size: 12px;
    font-weight: 500;
    line-height: 14px; /* 116.667% */
    letter-spacing: 0.96px;
    text-transform: uppercase;
  `,
  body1: css`
    font-size: 24px;
    font-weight: 400;
    line-height: 32px; /* 133.333% */
    letter-spacing: -0.48px;
  `,
  body2: css`
    font-size: 20px;
    font-weight: 400;
    line-height: 28px; /* 140% */
    letter-spacing: -0.4px;
  `,
  body3: css`
    font-size: 18px;
    font-weight: 400;
    line-height: 26px; /* 144.444% */
    letter-spacing: -0.36px;
  `,
  body4: css`
    font-size: 16px;
    font-weight: 400;
    line-height: 24px; /* 150% */
    letter-spacing: -0.32px;
  `,
  body5: css`
    font-size: 14px;
    font-weight: 400;
    line-height: 20px; /* 142.857% */
    letter-spacing: -0.28px;
  `,
  body6: css`
    font-size: 12px;
    font-weight: 400;
    line-height: 16px; /* 133.33% */
    letter-spacing: -0.24px;
  `,
  headline1: css`
    font-size: 40px;
    font-weight: 600;
    line-height: 48px; /* 120% */
    letter-spacing: -0.8px;
  `,
  headline2: css`
    font-size: 36px;
    font-weight: 600;
    line-height: 44px; /* 122.222% */
    letter-spacing: -0.72px;
  `,
  headline3: css`
    font-size: 32px;
    font-weight: 600;
    line-height: 40px; /* 125% */
    letter-spacing: -0.64px;
  `,
  headline4: css`
    font-size: 28px;
    font-weight: 600;
    line-height: 32px; /* 114.286% */
    letter-spacing: -0.56px;
  `,
  display1: css`
    font-size: 72px;
    font-weight: 600;
    line-height: 84px; /* 116.667% */
    letter-spacing: -2.16px;
  `,
  display2: css`
    font-size: 64px;
    font-weight: 600;
    line-height: 72px; /* 112.5% */
    letter-spacing: -1.92px;
  `,
  display3: css`
    font-size: 56px;
    font-weight: 600;
    line-height: 68px; /* 121.429% */
    letter-spacing: -1.68px;
  `,
  display4: css`
    font-size: 48px;
    font-weight: 600;
    line-height: 60px; /* 125% */
    letter-spacing: -1.44px;
  `,
  display5: css`
    font-size: 44px;
    font-weight: 600;
    line-height: 52px; /* 118.182% */
    letter-spacing: -1.32px;
  `,
};

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
  webNeutral: WebNeutral,
  webPrimary: WebPrimary,
  webBase: WebBase,
  webInput: WebInput,
  webError: WebError,
  webSuccess: WebSuccess,
  webWarning: WebWarning,
};

export const getTheme = <T1 extends keyof DefaultTheme, T2 extends keyof DefaultTheme[T1]>(
  val1: T1,
  val2: T2,
) => ({ theme }: { theme: DefaultTheme }): DefaultTheme[T1][T2] => theme[val1][val2];

export default theme;

declare module 'styled-components' {
  export interface DefaultTheme extends ThemeType {}
}
