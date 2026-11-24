import type { Preview } from '@storybook/react-native-web-vite';
import React, { ReactElement } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PHONE_FRAME, SAFE_AREA_METRICS } from '../src/stories/story-frame';
import { colors } from '../src/theme';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
  },
  decorators: [
    (Story): ReactElement => (
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <View style={{ ...PHONE_FRAME, backgroundColor: colors.background.canvas }}>
          <Story />
        </View>
      </SafeAreaProvider>
    ),
  ],
};

export default preview;
