import React, { ReactElement } from 'react';

import { MainTab } from '../../view-models';
import { BottomNavigation, BottomNavigationItem } from '../bottom-navigation';

export interface MainTabBarProps {
  selected: MainTab;
  showExplore: boolean;
  onNavigate: (tab: MainTab) => void;
  onSearch: () => void;
}

const SEARCH = 'search';

// Search opens a stacked page rather than a tab; Explore takes the distinct primary action.
export const MainTabBar = ({ selected, showExplore, onNavigate, onSearch }: MainTabBarProps): ReactElement => {
  const items: BottomNavigationItem<MainTab | typeof SEARCH>[] = [
    { key: MainTab.WALLET, icon: 'home', label: 'Wallet' },
    { key: SEARCH, icon: 'search', label: 'Search' },
    { key: MainTab.ACTIVITY, icon: 'activity', label: 'Activity' },
  ];

  const handleSelect = (key: MainTab | typeof SEARCH): void => (key === SEARCH ? onSearch() : onNavigate(key));

  const handleExplore = (): void => onNavigate(MainTab.EXPLORE);

  return (
    <BottomNavigation
      items={items}
      selected={selected}
      onSelect={handleSelect}
      primaryAction={showExplore ? { icon: 'globe', label: 'Explore', onPress: handleExplore } : undefined}
    />
  );
};
