import { ImageStyle, StyleSheet, TextStyle, ViewStyle } from 'react-native';

import type { ColorScheme } from '../domain/preferences';
import { useAppTheme } from '../hooks/use-app-theme';
import { ThemeColors, themeColors } from './colors';

type Styles = Record<string, ViewStyle | TextStyle | ImageStyle>;

export const useThemeColors = (): ThemeColors => themeColors[useAppTheme().scheme];

// Builds a style sheet once per scheme and returns a hook that picks the active one.
export const makeStyles = <S extends Styles>(factory: (colors: ThemeColors) => S & Styles): () => Readonly<S> => {
  const cache: Partial<Record<ColorScheme, Readonly<S>>> = {};

  const resolve = (scheme: ColorScheme): Readonly<S> => {
    cache[scheme] ??= StyleSheet.create(factory(themeColors[scheme]));

    return cache[scheme];
  };

  return (): Readonly<S> => resolve(useAppTheme().scheme);
};

// Spinner colors for a RefreshControl (iOS tint, Android colors and disc).
export const useRefreshControlColors = (): { tintColor: string; colors: string[]; progressBackgroundColor: string } => {
  const colors = useThemeColors();

  return { tintColor: colors.icon.secondary, colors: [colors.icon.primary], progressBackgroundColor: colors.background.surface };
};
