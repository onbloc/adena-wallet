import type { Preview } from '@storybook/react-native-web-vite';
import React, { ReactElement } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ColorScheme, ThemePreference } from '../src/domain/preferences';
import { AppThemeContext } from '../src/hooks/use-app-theme';
import { PHONE_FRAME, SAFE_AREA_METRICS } from '../src/stories/story-frame';
import { themeColors } from '../src/theme';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
  },
  globalTypes: {
    scheme: {
      description: 'Color scheme',
      toolbar: { title: 'Theme', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { scheme: 'light' },
  decorators: [
    (Story, context): ReactElement => {
      const scheme: ColorScheme = context.globals.scheme === 'dark' ? 'dark' : 'light';

      return (
        <AppThemeContext value={{ preference: ThemePreference.SYSTEM, scheme }}>
          <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
            <View style={{ ...PHONE_FRAME, backgroundColor: themeColors[scheme].background.canvas }}>
              <Story />
            </View>
          </SafeAreaProvider>
        </AppThemeContext>
      );
    },
  ],
};

export default preview;
