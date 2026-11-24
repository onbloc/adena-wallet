import { TextStyle } from 'react-native';

// Inter is bundled per weight, so each weight maps to its own font family.
export const fontFamily = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export type TypographyRole
  = | 'display'
    | 'title'
    | 'section'
    | 'row'
    | 'body'
    | 'button'
    | 'meta'
    | 'tab';

export const typography: Record<TypographyRole, TextStyle> = {
  display: { fontFamily: fontFamily.bold, fontSize: 40, lineHeight: 44, letterSpacing: -0.8 },
  title: { fontFamily: fontFamily.semiBold, fontSize: 26, lineHeight: 34 },
  section: { fontFamily: fontFamily.semiBold, fontSize: 18, lineHeight: 24 },
  row: { fontFamily: fontFamily.semiBold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  button: { fontFamily: fontFamily.semiBold, fontSize: 16, lineHeight: 20 },
  meta: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  tab: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16 },
};

export const tabularNumbers: TextStyle = { fontVariant: ['tabular-nums'] };
