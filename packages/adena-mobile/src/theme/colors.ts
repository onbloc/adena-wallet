import type { AvatarColor } from '../domain/account';
import type { ColorScheme } from '../domain/preferences';

// ADENA / Bold Monochrome light primitives (12).
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

// Dark primitives sampled from the dark-mode design sheet.
export const darkPalette = {
  gray950: '#121212',
  gray900: '#1C1C1E',
  gray850: '#242426',
  gray800: '#2F2F32',
  gray750: '#303033',
  gray700: '#3A3A3F',
  gray500: '#68686D',
  gray400: '#828287',
  gray300: '#A3A3A8',
  gray100: '#D8D9DA',
  gray50: '#F7F8F9',
  green300: '#6ED7A6',
  red300: '#FF8A80',
  amber300: '#E5B96F',
} as const;

type Roles<K extends string> = Readonly<Record<K, string>>;

export interface ThemeColors {
  background: Roles<'canvas' | 'surface' | 'subtle' | 'pressed'>;
  // `thumb` is the off-state switch knob, which must stand out from the secondary track.
  action: Roles<'primary' | 'primaryPressed' | 'secondary' | 'secondaryPressed' | 'disabled' | 'thumb'>;
  text: Roles<'primary' | 'secondary' | 'inverse' | 'disabled'>;
  icon: Roles<'primary' | 'secondary'>;
  border: Roles<'subtle' | 'input' | 'focus'>;
  status: Roles<'success' | 'error' | 'warning'>;
  chart: Roles<'line' | 'grid'>;
  overlay: Roles<'scrim' | 'shadow'>;
}

export const lightColors: ThemeColors = {
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
    thumb: palette.neutral0,
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
};

// Same roles as light; the primary action inverts to a light pill with dark text.
export const darkColors: ThemeColors = {
  background: {
    canvas: darkPalette.gray950,
    surface: darkPalette.gray900,
    subtle: darkPalette.gray850,
    pressed: darkPalette.gray800,
  },
  action: {
    primary: darkPalette.gray50,
    primaryPressed: darkPalette.gray100,
    secondary: darkPalette.gray850,
    secondaryPressed: darkPalette.gray750,
    disabled: darkPalette.gray750,
    thumb: darkPalette.gray300,
  },
  text: {
    primary: darkPalette.gray50,
    secondary: darkPalette.gray300,
    inverse: darkPalette.gray950,
    disabled: darkPalette.gray500,
  },
  icon: {
    primary: darkPalette.gray50,
    secondary: darkPalette.gray300,
  },
  border: {
    subtle: darkPalette.gray700,
    input: darkPalette.gray400,
    focus: darkPalette.gray50,
  },
  status: {
    success: darkPalette.green300,
    error: darkPalette.red300,
    warning: darkPalette.amber300,
  },
  chart: {
    line: darkPalette.gray50,
    grid: darkPalette.gray700,
  },
  overlay: {
    scrim: 'rgba(0, 0, 0, 0.56)',
    shadow: '#000000',
  },
};

export const themeColors: Record<ColorScheme, ThemeColors> = { light: lightColors, dark: darkColors };

// Fixed colors that must not follow the scheme (camera viewfinder, QR quiet zone, photo overlays).
export const fixedColors = {
  black: '#000000',
  white: '#FFFFFF',
} as const;

// User-picked avatar backgrounds with white initials (>= 4.5:1); "ink" follows the primary action instead.
export const avatarColors: Record<Exclude<AvatarColor, 'ink'>, string> = {
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
