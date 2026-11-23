import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MainTabBar } from '../components/molecules';
import { MainTab } from '../components/view-models';
import { ActivityScreen } from '../containers/main/activity-screen';
import { ExploreScreen } from '../containers/main/explore-screen';
import { HomeScreen } from '../containers/main/home-screen';
import { useContainer } from '../di/container-provider';
import { useWalletSnapshot } from '../hooks/use-wallet-snapshot';
import { colors } from '../theme';
import { MainTabParamList } from './types';

const Tabs = createBottomTabNavigator<MainTabParamList>();

const TAB_BY_ROUTE: Record<keyof MainTabParamList, MainTab> = { Wallet: MainTab.WALLET, Explore: MainTab.EXPLORE, Activity: MainTab.ACTIVITY };
const ROUTE_BY_TAB: Record<MainTab, keyof MainTabParamList> = { wallet: 'Wallet', explore: 'Explore', activity: 'Activity' };

const TabBar = ({ state, navigation, showExplore }: BottomTabBarProps & { showExplore: boolean }): ReactElement => {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index].name as keyof MainTabParamList;

  const handleNavigate = (tab: MainTab): void => navigation.navigate(ROUTE_BY_TAB[tab]);

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      <MainTabBar
        selected={TAB_BY_ROUTE[current]}
        showExplore={showExplore}
        onNavigate={handleNavigate}
      />
    </View>
  );
};

export const MainTabs = (): ReactElement => {
  const { exploreService } = useContainer();
  const { network } = useWalletSnapshot();
  // Explore is curated per chain family (e.g. hidden on AtomOne).
  const showExplore = exploreService.getApps(network).length > 0;

  const tabBarTabsNavigator = (props: BottomTabBarProps): React.JSX.Element => <TabBar {...props} showExplore={showExplore} />;

  return (
    <Tabs.Navigator
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background.canvas } }}
      tabBar={tabBarTabsNavigator}
    >
      <Tabs.Screen name='Wallet' component={HomeScreen} />
      {showExplore && <Tabs.Screen name='Explore' component={ExploreScreen} />}
      <Tabs.Screen name='Activity' component={ActivityScreen} />
    </Tabs.Navigator>
  );
};

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.background.canvas, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
});
