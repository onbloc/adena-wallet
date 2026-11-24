import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ContainerProvider } from '../src/di/container-provider';
import { MainTabs } from '../src/navigation/main-tabs';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from './helpers/test-container';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const Stack = createNativeStackNavigator();

describe('main tabs', () => {
  it('switches tabs without stacking duplicate screens', async () => {
    const env = createTestContainer();

    await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    const ref = createNavigationContainerRef();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ContainerProvider container={env.container}>
          <QueryClientProvider client={client}>
            <NavigationContainer ref={ref}>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name='Main' component={MainTabs} />
              </Stack.Navigator>
            </NavigationContainer>
          </QueryClientProvider>
        </ContainerProvider>
      </SafeAreaProvider>,
    );

    for (const tab of ['Activity', 'Wallet', 'Activity', 'Wallet']) {
      await fireEvent.press(await screen.findByRole('button', { name: tab }));
    }

    await waitFor(() => {
      const root = ref.getRootState()!;

      expect(root.routes).toHaveLength(1);
      const tabs = root.routes[0].state;

      expect(tabs?.routes.map(route => route.name)).toEqual(['Wallet', 'Activity']);
      expect(tabs?.routes[tabs.index ?? 0].name).toBe('Wallet');
    });
  });
});
