import { createContext, use } from 'react';

import { ColorScheme, ThemePreference } from '../domain/preferences';

export interface AppTheme {
  // Stored choice, including "system".
  preference: ThemePreference;
  // Resolved scheme screens should render with.
  scheme: ColorScheme;
}

// Light until the app shell provides the preference-aware value, so stories and tests stay light.
export const AppThemeContext = createContext<AppTheme>({ preference: ThemePreference.SYSTEM, scheme: 'light' });

export const useAppTheme = (): AppTheme => use(AppThemeContext);
