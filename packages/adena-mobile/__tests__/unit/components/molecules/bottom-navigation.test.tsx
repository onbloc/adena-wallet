import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { BottomNavigation } from '../../../../src/components/molecules';

describe('BottomNavigation', () => {
  it('selects destinations and runs the primary action', async () => {
    const onSelect = jest.fn();
    const onPress = jest.fn();

    await render(
      <BottomNavigation
        items={[{ key: 'a', icon: 'home', label: 'Home' }, { key: 'b', icon: 'search', label: 'Search', disabled: true }]}
        selected='a'
        onSelect={onSelect}
        primaryAction={{ icon: 'plus', label: 'Add', onPress }}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Home' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Search' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('a');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders without a primary action or items', async () => {
    await render(<BottomNavigation items={[]} selected='a' onSelect={jest.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
