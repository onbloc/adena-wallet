import {
  colorTokens,
  FontToken,
  fontTokens,
  FontsType,
  webFontTokens,
  WebFontType,
} from '@styles/tokens';
import {Platform, TextStyle} from 'react-native';

export {colorTokens};

const {neutral, primary, red, green, webNeutral, webBase, webInput, webError} =
  colorTokens;

/**
 * App palette, taken from the extension popup (dark) so both clients look the
 * same. The wallet screens use the popup colours; onboarding uses the
 * extension's full-page (web) colours, as the extension does.
 */
export const colors = {
  background: neutral._8,
  surface: neutral._9,
  surfaceRaised: neutral._7,
  text: neutral._1,
  textMuted: neutral.a,
  textSubtle: neutral._3,
  border: neutral._7,
  borderStrong: neutral._3,
  primary: primary._6,
  primaryPressed: primary._7,
  primaryDisabled: primary._9,
  primaryText: neutral._1,
  disabledText: neutral._5,
  danger: red._5,
  dangerSurface: 'rgba(239, 45, 33, 0.08)',
  warning: '#FB923C',
  warningSurface: 'rgba(251, 146, 60, 0.08)',
  success: green._5,
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export const webColors = {
  background: webBase._100,
  input: webInput._100,
  text: webNeutral._0,
  textMuted: webNeutral._500,
  textSubtle: webNeutral._700,
  border: webNeutral._800,
  primary: colorTokens.webPrimary._100,
  error: webError._100,
  errorSurface: webError._300,
} as const;

export const spacing = {xs: 4, sm: 8, md: 16, lg: 24, xl: 32};

export const radius = {sm: 8, md: 18, pill: 30};

/** Static Inter files per weight (see assets/fonts and Info.plist). */
const INTER_BY_WEIGHT: Record<FontToken['fontWeight'], string> = {
  300: 'Inter-Light',
  400: 'Inter-Regular',
  500: 'Inter-Medium',
  600: 'Inter-SemiBold',
  700: 'Inter-Bold',
};

/**
 * A static font file already carries its weight, so fontWeight is left out:
 * on Android a fontWeight next to a custom family makes it fall back to the
 * system font.
 */
const toTextStyle = (token: FontToken): TextStyle => ({
  fontFamily: INTER_BY_WEIGHT[token.fontWeight],
  fontSize: token.fontSize,
  lineHeight: token.lineHeight,
  ...(token.letterSpacing !== undefined
    ? {letterSpacing: token.letterSpacing}
    : null),
  ...(token.uppercase ? {textTransform: 'uppercase'} : null),
});

const mapFonts = <K extends string>(
  tokens: Record<K, FontToken>,
): Record<K, TextStyle> =>
  Object.fromEntries(
    Object.entries<FontToken>(tokens).map(([name, token]) => [
      name,
      toTextStyle(token),
    ]),
  ) as Record<K, TextStyle>;

/**
 * A font for a single-line TextInput: without lineHeight, which pushes the
 * text toward the bottom of the field on iOS.
 */
export function inputFont(style: TextStyle): TextStyle {
  const rest = {...style};
  delete rest.lineHeight;
  return rest;
}

/** Popup type scale (header4, body1Bold, ...). */
export const fonts: Record<FontsType, TextStyle> = mapFonts(fontTokens);

/** Web type scale (title1, body4, ...), used by onboarding. */
export const webFonts: Record<WebFontType, TextStyle> = mapFonts(webFontTokens);

export const monoFont = {
  fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
} as const;
