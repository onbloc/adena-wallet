import React, { PropsWithChildren, ReactElement, useMemo } from 'react';
import { StatusBar, useColorScheme } from 'react-native';

import { resolveColorScheme } from '../domain/preferences';
import { AppThemeContext } from '../hooks/use-app-theme';
import { usePreference } from '../hooks/use-preference';

// Resolves the theme preference against the OS scheme and keeps the status bar readable.
// Palettes do not switch yet; components read `useAppTheme().scheme` once dark styles land.
export const AppThemeProvider = ({ children }: PropsWithChildren): ReactElement => {
  const preference = usePreference('theme');
  const system = useColorScheme();
  const scheme = resolveColorScheme(preference, system);
  const value = useMemo(() => ({ preference, scheme }), [preference, scheme]);

  return (
    <AppThemeContext value={value}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      {children}
    </AppThemeContext>
  );
};
