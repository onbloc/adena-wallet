import type { AvatarColor } from '../domain/account';

// ADENA / Bold Monochrome color primitives (12) and semantic aliases (23).
export const palette = {
  neutral0: '#FFFFFF',
  neutral50: '#F7F8F9',
  neutral100: '#F1F3F4',
  neutral150: '#E6E6E6',
  neutral200: '#E2E2E2',
  neutral400: '#858585',
  neutral500: '#636363',
  neutral600: '#333333',
  neutral900: '#121212',
  green700: '#067647',
  red700: '#B42318',
  amber700: '#8A5B00',
} as const;

export const colors = {
  background: {
    canvas: palette.neutral0,
    surface: palette.neutral0,
    subtle: palette.neutral50,
    pressed: palette.neutral100,
  },
  action: {
    primary: palette.neutral900,
    primaryPressed: palette.neutral600,
    secondary: palette.neutral100,
    secondaryPressed: palette.neutral150,
    disabled: palette.neutral150,
  },
  text: {
    primary: palette.neutral900,
    secondary: palette.neutral500,
    inverse: palette.neutral0,
    disabled: palette.neutral400,
  },
  icon: {
    primary: palette.neutral900,
    secondary: palette.neutral500,
  },
  border: {
    subtle: palette.neutral200,
    input: palette.neutral400,
    focus: palette.neutral900,
  },
  status: {
    success: palette.green700,
    error: palette.red700,
    warning: palette.amber700,
  },
  chart: {
    line: palette.neutral900,
    grid: palette.neutral200,
  },
  overlay: {
    scrim: 'rgba(18, 18, 18, 0.32)',
    shadow: '#000000',
  },
} as const;

// User-picked avatar backgrounds; each keeps inverse text above 4.5:1 contrast.
export const avatarColors: Record<AvatarColor, string> = {
  ink: palette.neutral900,
  blue: '#1D4ED8',
  violet: '#6D28D9',
  pink: '#BE185D',
  red: palette.red700,
  amber: palette.amber700,
  green: palette.green700,
  teal: '#0E7490',
};

export const StatusTone = {
  NEUTRAL: 'neutral',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  INFO: 'info',
} as const;

export type StatusTone = (typeof StatusTone)[keyof typeof StatusTone];
