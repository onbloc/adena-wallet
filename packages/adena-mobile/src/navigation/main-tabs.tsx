import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingNavigationOffset, MainTabBar } from '../components/molecules';
import { MainTab } from '../components/view-models';
import { ActivityScreen } from '../containers/main/activity-screen';
import { HomeScreen } from '../containers/main/home-screen';
import { useContainer } from '../di/container-provider';
import { useWalletSnapshot } from '../hooks/use-wallet-snapshot';
import { useThemeColors } from '../theme';
import { MainTabParamList } from './types';

const Tabs = createBottomTabNavigator<MainTabParamList>();

const TAB_BY_ROUTE: Record<keyof MainTabParamList, MainTab> = { Wallet: MainTab.WALLET, Activity: MainTab.ACTIVITY };
const ROUTE_BY_TAB: Record<MainTab, keyof MainTabParamList> = { wallet: 'Wallet', activity: 'Activity' };

const TabBar = ({ state, navigation, showSwap }: BottomTabBarProps & { showSwap: boolean }): ReactElement => {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index].name as keyof MainTabParamList;

  const handleNavigate = (tab: MainTab): void => navigation.navigate(ROUTE_BY_TAB[tab]);

  // Bubbles up to the main stack, which owns the Search page.
  const handleSearch = (): void => navigation.navigate('Search');

  const handleSwap = (): void => navigation.navigate('Swap');

  return (
    <View pointerEvents='box-none' style={[styles.bar, { bottom: getFloatingNavigationOffset(insets.bottom) }]}>
      <MainTabBar
        selected={TAB_BY_ROUTE[current]}
        showSwap={showSwap}
        onNavigate={handleNavigate}
        onSearch={handleSearch}
        onSwap={handleSwap}
      />
    </View>
  );
};

export const MainTabs = (): ReactElement => {
  const colors = useThemeColors();
  const { swapService } = useContainer();
  const { network } = useWalletSnapshot();
  // Swap needs GnoSwap metadata for the network (none on AtomOne or custom networks).
  const showSwap = swapService.isSupported(network);

  const tabBarTabsNavigator = (props: BottomTabBarProps): React.JSX.Element => <TabBar {...props} showSwap={showSwap} />;

  return (
    <Tabs.Navigator
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background.canvas } }}
      tabBar={tabBarTabsNavigator}
    >
      <Tabs.Screen name='Wallet' component={HomeScreen} />
      <Tabs.Screen name='Activity' component={ActivityScreen} />
    </Tabs.Navigator>
  );
};

// Floats over the scenes instead of reserving a bar; tab pages pad their content to clear it.
const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0 },
});
