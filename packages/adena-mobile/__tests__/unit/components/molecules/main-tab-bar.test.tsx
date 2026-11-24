import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { MainTabBar } from '../../../../src/components/molecules';
import { MainTab } from '../../../../src/components/view-models';

describe('MainTabBar', () => {
  it('includes Explore when enabled and navigates', async () => {
    const onNavigate = jest.fn();

    await render(<MainTabBar selected={MainTab.WALLET} showExplore onNavigate={onNavigate} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Explore' }));
    expect(onNavigate).toHaveBeenCalledWith(MainTab.EXPLORE);
  });

  it('hides Explore', async () => {
    await render(<MainTabBar selected={MainTab.ACTIVITY} showExplore={false} onNavigate={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Explore' })).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });
});
