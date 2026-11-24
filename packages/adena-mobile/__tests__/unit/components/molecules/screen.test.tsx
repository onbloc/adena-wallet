import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text } from '../../../../src/components/atoms';
import { Screen } from '../../../../src/components/molecules';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

describe('Screen', () => {
  it('renders header, scrollable content and footer', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Screen testID='screen' header={<Text>Header</Text>} footer={<Text>Footer</Text>}><Text>Body</Text></Screen>
      </SafeAreaProvider>,
    );
    expect(screen.getByTestId('screen')).toBeTruthy();
    expect(screen.getByText('Header')).toBeTruthy();
    expect(screen.getByText('Footer')).toBeTruthy();
    expect(screen.getByText('Body')).toBeTruthy();
  });

  it('renders fixed content without footer on Android', async () => {
    const original = Platform.OS;

    Platform.OS = 'android';
    const { container } = await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Screen scrollable={false}><Text>Fixed</Text></Screen>
      </SafeAreaProvider>,
    );

    Platform.OS = original;
    expect(screen.getByText('Fixed')).toBeTruthy();
    expect(container.queryAll(node => node.type === 'RCTScrollView')).toHaveLength(0);
  });
});
