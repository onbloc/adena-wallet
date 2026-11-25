import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React, { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppContainer } from '../../../src/di/container';
import { ContainerProvider } from '../../../src/di/container-provider';
import { MainTabs } from '../../../src/navigation/main-tabs';

const mockScreen = (name: string): ReactElement => {
  const { Text } = jest.requireActual('react-native');

  return <Text>{name}</Text>;
};

jest.mock('../../../src/containers/main/home-screen', () => ({ HomeScreen: () => mockScreen('HomeScreen') }));
jest.mock('../../../src/containers/main/explore-screen', () => ({ ExploreScreen: () => mockScreen('ExploreScreen') }));
jest.mock('../../../src/containers/main/activity-screen', () => ({ ActivityScreen: () => mockScreen('ActivityScreen') }));
jest.mock('../../../src/hooks/use-wallet-snapshot', () => ({ useWalletSnapshot: () => ({ network: { id: 'gno' } }) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 20 } };
const Stack = createNativeStackNavigator();
const SearchStub = (): ReactElement => mockScreen('SearchScreen');

const renderTabs = (apps: unknown[]) => {
  const container = { exploreService: { getApps: jest.fn(() => apps) } } as unknown as AppContainer;

  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ContainerProvider container={container}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name='Main' component={MainTabs} />
            <Stack.Screen name='Search' component={SearchStub} />
          </Stack.Navigator>
        </NavigationContainer>
      </ContainerProvider>
    </SafeAreaProvider>,
  );
};

describe('MainTabs', () => {
  it('shows Explore when the network has apps and switches tabs', async () => {
    await renderTabs([{ id: 'app' }]);
    expect(screen.getByText('HomeScreen')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Explore' }));
    expect(await screen.findByText('ExploreScreen')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Activity' }));
    expect(await screen.findByText('ActivityScreen')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Wallet' }));
    expect(screen.getByText('HomeScreen')).toBeTruthy();
  });

  it('opens the stacked Search page from the search icon', async () => {
    await renderTabs([]);
    await fireEvent.press(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('SearchScreen')).toBeTruthy();
  });

  it('hides Explore when the network has no curated apps', async () => {
    await renderTabs([]);
    expect(screen.queryByRole('button', { name: 'Explore' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Activity' }));
    expect(await screen.findByText('ActivityScreen')).toBeTruthy();
  });
});
