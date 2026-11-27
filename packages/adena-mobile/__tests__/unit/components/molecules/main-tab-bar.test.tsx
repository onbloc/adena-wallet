import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { MainTabBar, MainTabBarProps } from '../../../../src/components/molecules';
import { MainTab } from '../../../../src/components/view-models';

const props = (overrides: Partial<MainTabBarProps> = {}): MainTabBarProps => ({
  selected: MainTab.WALLET,
  showSwap: true,
  onNavigate: jest.fn(),
  onSearch: jest.fn(),
  onChat: jest.fn(),
  onSwap: jest.fn(),
  ...overrides,
});

describe('MainTabBar', () => {
  it('navigates tabs, opens search and chat and offers Swap as the primary action', async () => {
    const bar = props();

    await render(<MainTabBar {...bar} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Search' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Activity' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Chat' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Swap' }));

    expect(bar.onSearch).toHaveBeenCalledTimes(1);
    expect(bar.onChat).toHaveBeenCalledTimes(1);
    expect(bar.onSwap).toHaveBeenCalledTimes(1);
    expect((bar.onNavigate as jest.Mock).mock.calls).toEqual([[MainTab.ACTIVITY]]);
    expect(screen.queryByRole('button', { name: 'Explore' })).toBeNull();
  });

  it('places Chat after Activity', async () => {
    await render(<MainTabBar {...props()} />);
    expect(screen.getAllByRole('button').map(button => button.props.accessibilityLabel)).toEqual(['Wallet', 'Search', 'Activity', 'Chat', 'Swap']);
  });

  it('hides Swap on networks without a DEX', async () => {
    await render(<MainTabBar {...props({ selected: MainTab.ACTIVITY, showSwap: false })} />);
    expect(screen.queryByRole('button', { name: 'Swap' })).toBeNull();
  });

  it('hides Chat when the assistant is unavailable', async () => {
    await render(<MainTabBar {...props({ showChat: false })} />);
    expect(screen.queryByRole('button', { name: 'Chat' })).toBeNull();
  });
});
