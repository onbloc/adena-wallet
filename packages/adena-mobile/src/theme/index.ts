import { colors, palette } from './colors';
import { elevation, motion, radius, sizes, spacing } from './layout';
import { fontFamily, tabularNumbers, typography } from './typography';

export const theme = {
  palette,
  colors,
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
export * from './typography';
