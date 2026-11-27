import React, { ReactElement } from 'react';

import { MainTab } from '../../view-models';
import { BottomNavigation, BottomNavigationItem } from '../bottom-navigation';

export interface MainTabBarProps {
  selected: MainTab;
  // False on networks without a DEX; the primary action is then hidden.
  showSwap: boolean;
  // False where the assistant is unavailable; defaults to shown.
  showChat?: boolean;
  onNavigate: (tab: MainTab) => void;
  onSearch: () => void;
  onChat: () => void;
  onSwap: () => void;
}

const SEARCH = 'search';
const CHAT = 'chat';

// Search and Chat open stacked pages rather than tabs; Swap takes the distinct primary action.
export const MainTabBar = ({ selected, showSwap, showChat = true, onNavigate, onSearch, onChat, onSwap }: MainTabBarProps): ReactElement => {
  const items: BottomNavigationItem<MainTab | typeof SEARCH | typeof CHAT>[] = [
    { key: MainTab.WALLET, icon: 'home', label: 'Wallet' },
    { key: SEARCH, icon: 'search', label: 'Search' },
    { key: MainTab.ACTIVITY, icon: 'activity', label: 'Activity' },
    ...(showChat ? [{ key: CHAT as typeof CHAT, icon: 'chat' as const, label: 'Chat' }] : []),
  ];

  const handleSelect = (key: MainTab | typeof SEARCH | typeof CHAT): void => {
    if (key === SEARCH) {
      onSearch();
    }
    else if (key === CHAT) {
      onChat();
    }
    else {
      onNavigate(key);
    }
  };

  return (
    <BottomNavigation
      items={items}
      selected={selected}
      onSelect={handleSelect}
      primaryAction={showSwap ? { icon: 'tokenSwap', label: 'Swap', onPress: onSwap } : undefined}
    />
  );
};
