import { fireEvent, render, screen } from '@testing-library/react-native';
import React, { ReactElement } from 'react';

import { Switch } from '../../../src/components/atoms';
import { BottomNavigation, NumericKeypad, Tabs } from '../../../src/components/molecules';
import { HapticKind } from '../../../src/domain/haptics';
import { HapticsContext } from '../../../src/hooks/use-haptics';

const renderWithHaptics = (element: ReactElement) => {
  const play = jest.fn();

  return { play, rendered: render(<HapticsContext value={play}>{element}</HapticsContext>) };
};

describe('interactive controls play haptics', () => {
  it('ticks on switch toggles', async () => {
    const onValueChange = jest.fn();
    const { play, rendered } = renderWithHaptics(<Switch value={false} accessibilityLabel='Haptic touch' onValueChange={onValueChange} />);

    await rendered;
    await fireEvent.press(screen.getByRole('switch', { name: 'Haptic touch' }));
    expect(play).toHaveBeenCalledWith(HapticKind.SELECTION);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('ticks on tab changes', async () => {
    const onSelect = jest.fn();
    const { play, rendered } = renderWithHaptics(<Tabs items={[{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]} selected='a' onSelect={onSelect} />);

    await rendered;
    await fireEvent.press(screen.getByRole('tab', { name: 'B' }));
    expect(play).toHaveBeenCalledWith(HapticKind.SELECTION);
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('taps on keypad keys', async () => {
    const onKeyPress = jest.fn();
    const { play, rendered } = renderWithHaptics(<NumericKeypad onKeyPress={onKeyPress} />);

    await rendered;
    await fireEvent.press(screen.getByLabelText('7'));
    expect(play).toHaveBeenCalledWith(HapticKind.IMPACT);
    expect(onKeyPress).toHaveBeenCalledWith('7');
  });

  it('ticks on navigation destinations and taps on the primary action', async () => {
    const onSelect = jest.fn();
    const onPress = jest.fn();
    const { play, rendered } = renderWithHaptics(
      <BottomNavigation items={[{ key: 'a', icon: 'home', label: 'Home' }]} selected='a' onSelect={onSelect} primaryAction={{ icon: 'globe', label: 'Explore', onPress }} />,
    );

    await rendered;
    await fireEvent.press(screen.getByRole('button', { name: 'Home' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Explore' }));
    expect(play.mock.calls).toEqual([[HapticKind.SELECTION], [HapticKind.IMPACT]]);
    expect(onSelect).toHaveBeenCalledWith('a');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('stays silent without a provider', async () => {
    const onValueChange = jest.fn();

    await render(<Switch value accessibilityLabel='Haptic touch' onValueChange={onValueChange} />);
    await fireEvent.press(screen.getByRole('switch', { name: 'Haptic touch' }));
    expect(onValueChange).toHaveBeenCalledWith(false);
  });
});
