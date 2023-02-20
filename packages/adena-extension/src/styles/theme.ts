import { css, FlattenSimpleInterpolation } from 'styled-components';
import mixins from './mixins';

export enum Neutral {
  '#FFFFFF', // 0
  '#E7E8F3', // 1
  '#A3A3B5', // 2
  '#646486', // 3
  '#52526B', // 4
  '#39394E', // 5
  '#32323D', // 6
  '#212128', // 7
  '#191920', // 8
  '#777777', // 9
  '#636368', // 10
  '#454554', //11
}

export enum Primary {
  '#B0CCFF', // 0
  '#78A7FF', // 1
  '#377DFF', // 2
  '#0059FF', // 3
  '#0043C1', // 4
  '#003290', // 5
  '#001D52', // 6
}

export enum Red {
  '#FFA59F', // 0
  '#FF7B73', // 1
  '#EF2D21', // 2
  '#D6160A', // 3
  '#BB0B00', // 4
  '#BB160B', // 5
  '#E7323B' // 6
}

export enum Green {
  '#7DEECC', // 0
  '#5ADAB3', // 1
  '#0DBE89', // 2
  '#09A375', // 3
  '#057E5A', // 4
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
    line-height: 34px;
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
  `
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

const theme = {
  color: {
    neutral: Neutral,
    primary: Primary,
    red: Red,
    green: Green,
  },
  mixins,
  fonts,
};

export default theme;
