import { act, screen } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { SplashPage } from '../../../../src/components/pages';
import { ThemePreference } from '../../../../src/domain/preferences';
import { AppThemeContext } from '../../../../src/hooks/use-app-theme';
import { themeColors } from '../../../../src/theme';
import { renderPage } from './render-page';

const backgroundLayer = () => StyleSheet.flatten(screen.getByTestId('splash-background').props.style);

describe('SplashPage', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shows the launch logo on the light canvas with an accessible label', async () => {
    await renderPage(<SplashPage />);

    expect(screen.getByLabelText('Adena')).toBeTruthy();
    expect(backgroundLayer()).toMatchObject({ backgroundColor: themeColors.light.background.canvas, opacity: 1 });
  });

  it('covers a light launch screen with the dark canvas, without motion when reduced', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await renderPage(
      <AppThemeContext value={{ preference: ThemePreference.DARK, scheme: 'dark' }}>
        <SplashPage />
      </AppThemeContext>,
    );
    await act(async () => undefined);

    expect(backgroundLayer()).toMatchObject({ backgroundColor: themeColors.dark.background.canvas, opacity: 1 });
  });
});
