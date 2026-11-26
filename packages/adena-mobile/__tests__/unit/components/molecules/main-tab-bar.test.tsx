import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { MainTabBar } from '../../../../src/components/molecules';
import { MainTab } from '../../../../src/components/view-models';

describe('MainTabBar', () => {
  it('navigates tabs, opens search and offers Swap as the primary action', async () => {
    const onNavigate = jest.fn();
    const onSearch = jest.fn();
    const onSwap = jest.fn();

    await render(<MainTabBar selected={MainTab.WALLET} showSwap onNavigate={onNavigate} onSearch={onSearch} onSwap={onSwap} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Search' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cards' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Activity' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Swap' }));

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSwap).toHaveBeenCalledTimes(1);
    expect(onNavigate.mock.calls).toEqual([[MainTab.CARDS], [MainTab.ACTIVITY]]);
    expect(screen.queryByRole('button', { name: 'Explore' })).toBeNull();
  });

  it('hides Swap on networks without a DEX', async () => {
    await render(<MainTabBar selected={MainTab.ACTIVITY} showSwap={false} onNavigate={jest.fn()} onSearch={jest.fn()} onSwap={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Swap' })).toBeNull();
    expect(screen.getAllByRole('button').map(button => button.props.accessibilityLabel)).toEqual(['Wallet', 'Cards', 'Search', 'Activity']);
  });
});
