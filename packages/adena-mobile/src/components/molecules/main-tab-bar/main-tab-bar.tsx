import React, { ReactElement } from 'react';

import { MainTab } from '../../view-models';
import { BottomNavigation, BottomNavigationItem } from '../bottom-navigation';

export interface MainTabBarProps {
  selected: MainTab;
  showExplore: boolean;
  onNavigate: (tab: MainTab) => void;
}

export const MainTabBar = ({ selected, showExplore, onNavigate }: MainTabBarProps): ReactElement => {
  const items: BottomNavigationItem<MainTab>[] = [
    { key: MainTab.WALLET, icon: 'home', label: 'Wallet' },
    ...(showExplore ? [{ key: MainTab.EXPLORE, icon: 'search' as const, label: 'Explore' }] : []),
    { key: MainTab.ACTIVITY, icon: 'activity', label: 'Activity' },
  ];

  return <BottomNavigation items={items} selected={selected} onSelect={onNavigate} />;
};
