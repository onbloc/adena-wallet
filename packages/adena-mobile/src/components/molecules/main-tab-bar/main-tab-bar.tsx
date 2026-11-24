import React, { ReactElement } from 'react';

import { MainTab } from '../../view-models';
import { BottomNavigation, BottomNavigationItem } from '../bottom-navigation';

export interface MainTabBarProps {
  selected: MainTab;
  // False on networks without a DEX; the primary action is then hidden.
  showSwap: boolean;
  onNavigate: (tab: MainTab) => void;
  onSearch: () => void;
  onSwap: () => void;
}

const SEARCH = 'search';

// Search opens a stacked page rather than a tab; Swap takes the distinct primary action.
export const MainTabBar = ({ selected, showSwap, onNavigate, onSearch, onSwap }: MainTabBarProps): ReactElement => {
  const items: BottomNavigationItem<MainTab | typeof SEARCH>[] = [
    { key: MainTab.WALLET, icon: 'home', label: 'Wallet' },
    { key: SEARCH, icon: 'search', label: 'Search' },
    { key: MainTab.ACTIVITY, icon: 'activity', label: 'Activity' },
  ];

  const handleSelect = (key: MainTab | typeof SEARCH): void => (key === SEARCH ? onSearch() : onNavigate(key));

  return (
    <BottomNavigation
      items={items}
      selected={selected}
      onSelect={handleSelect}
      primaryAction={showSwap ? { icon: 'tokenSwap', label: 'Swap', onPress: onSwap } : undefined}
    />
  );
};
