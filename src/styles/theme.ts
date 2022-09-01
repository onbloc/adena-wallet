import { css } from 'styled-components';
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
}

export enum Green {
  '#7DEECC', // 0
  '#5ADAB3', // 1
  '#0DBE89', // 2
  '#09A375', // 3
  '#057E5A', // 4
}

export enum PrimaryShadow {
  '0px 4px 4px rgba(0, 0, 0, 0.4)',
  '0px 8px 8px rgba(0, 0, 0, 0.5)',
  '0px 12px 12px rgba(0, 0, 0, 0.5)',
}

export enum BlueShadow {
  '0px 4px 4px rgba(0, 0, 0, 0.25), 0px 4px 4px #001D52',
  '0px 8px 8px #001D52',
  '0px 12px 12px #001D52',
}

const theme = {
  color: {
    neutral: Neutral,
    primary: Primary,
    red: Red,
    green: Green,
  },
  boxShadow: {
    primary: PrimaryShadow,
    blue: BlueShadow,
  },
  mixins,
};

export default theme;
