import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { MainTabBar } from '../../../../src/components/molecules';
import { MainTab } from '../../../../src/components/view-models';

describe('MainTabBar', () => {
  it('navigates tabs, opens search and offers Explore as the primary action', async () => {
    const onNavigate = jest.fn();
    const onSearch = jest.fn();

    await render(<MainTabBar selected={MainTab.WALLET} showExplore onNavigate={onNavigate} onSearch={onSearch} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Search' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Activity' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Explore' }));

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onNavigate.mock.calls).toEqual([[MainTab.ACTIVITY], [MainTab.EXPLORE]]);
  });

  it('hides Explore', async () => {
    await render(<MainTabBar selected={MainTab.ACTIVITY} showExplore={false} onNavigate={jest.fn()} onSearch={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Explore' })).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });
});
