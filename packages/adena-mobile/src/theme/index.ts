import { darkPalette, palette, themeColors } from './colors';
import { elevation, motion, radius, sizes, spacing } from './layout';
import { fontFamily, tabularNumbers, typography } from './typography';

export const theme = {
  palette,
  colors: themeColors,
  darkPalette,
  typography,
  fontFamily,
  tabularNumbers,
  spacing,
  radius,
  sizes,
  motion,
  elevation,
} as const;

export type Theme = typeof theme;

export * from './colors';
export * from './layout';
export * from './themed';
export * from './typography';
