import { fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import React, { PropsWithChildren, ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomNavigation, getFloatingNavigationOffset, useFloatingNavigationClearance } from '../../../../src/components/molecules';
import { sizes, spacing } from '../../../../src/theme';

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

describe('floating navigation layout', () => {
  const withInsets = (bottom: number) => ({ children }: PropsWithChildren): ReactElement => (
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom } }}>{children}</SafeAreaProvider>
  );

  it('sits on the safe area edge, keeping a gap on devices without an inset', () => {
    expect(getFloatingNavigationOffset(34)).toBe(34);
    expect(getFloatingNavigationOffset(0)).toBe(spacing.space16);
  });

  it('pads scrolling content past the floating buttons', async () => {
    const { result } = await renderHook(useFloatingNavigationClearance, { wrapper: withInsets(34) });

    expect(result.current).toBe(34 + sizes.bottomNavigation + spacing.space24);
  });

  it('assumes no inset outside a SafeAreaProvider', async () => {
    const { result } = await renderHook(useFloatingNavigationClearance);

    expect(result.current).toBe(spacing.space16 + sizes.bottomNavigation + spacing.space24);
  });

  it('keeps every destination at least a 44pt touch target', async () => {
    await render(<BottomNavigation items={[{ key: 'a', icon: 'home', label: 'Home' }]} selected='a' onSelect={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Home' })).toHaveStyle({ width: sizes.bottomNavigation - spacing.space8 });
    expect(sizes.bottomNavigation - spacing.space8).toBeGreaterThanOrEqual(sizes.touchTarget);
  });
});
