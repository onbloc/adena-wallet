import React, { PropsWithChildren, ReactElement } from 'react';

import { ColorScheme } from '../../src/domain/preferences';
import { AppThemeContext } from '../../src/hooks/use-app-theme';

// Renders children as if the app shell resolved the given scheme.
export const withScheme = (scheme: ColorScheme, element: ReactElement): ReactElement => (
  <AppThemeContext value={{ preference: scheme, scheme }}>{element}</AppThemeContext>
);

export const SchemeWrapper = ({ scheme, children }: PropsWithChildren<{ scheme: ColorScheme }>): ReactElement => withScheme(scheme, <>{children}</>);
