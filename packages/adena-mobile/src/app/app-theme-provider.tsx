import React, { PropsWithChildren, ReactElement, useEffect, useMemo } from 'react';
import { Appearance, StatusBar, useColorScheme } from 'react-native';

import { resolveColorScheme, ThemePreference } from '../domain/preferences';
import { AppThemeContext } from '../hooks/use-app-theme';
import { usePreference } from '../hooks/use-preference';

// Resolves the theme preference against the OS scheme and keeps the status bar readable.
// Forcing the native appearance too keeps keyboards, alerts and the Android window in step.
export const AppThemeProvider = ({ children }: PropsWithChildren): ReactElement => {
  const preference = usePreference('theme');
  const system = useColorScheme();

  useEffect(() => {
    Appearance.setColorScheme?.(preference === ThemePreference.SYSTEM ? 'unspecified' : preference);
  }, [preference]);

  const scheme = resolveColorScheme(preference, system);
  const value = useMemo(() => ({ preference, scheme }), [preference, scheme]);

  return (
    <AppThemeContext value={value}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      {children}
    </AppThemeContext>
  );
};

// Follows the OS before the container (and the stored preference) exists, e.g. boot failures.
export const SystemThemeProvider = ({ children }: PropsWithChildren): ReactElement => {
  const scheme = resolveColorScheme(ThemePreference.SYSTEM, useColorScheme());
  const value = useMemo(() => ({ preference: ThemePreference.SYSTEM, scheme }), [scheme]);

  return (
    <AppThemeContext value={value}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      {children}
    </AppThemeContext>
  );
};
