import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

import { Spinner } from '../../../../src/components/atoms';

describe('Spinner', () => {
  let loop: jest.SpyInstance;
  const start = jest.fn();
  const stop = jest.fn();

  beforeEach(() => {
    start.mockClear();
    stop.mockClear();
    loop = jest.spyOn(Animated, 'loop').mockReturnValue({ start, stop, reset: jest.fn() });
  });

  afterEach(() => {
    loop.mockRestore();
    jest.restoreAllMocks();
  });

  it('spins unless reduced motion is on, and stops on unmount', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const { unmount } = await render(<Spinner tone='inverse' size={16} />);

    await act(async () => undefined);
    expect(screen.toJSON()).toMatchObject({ props: { accessibilityRole: 'progressbar' } });
    expect(start).toHaveBeenCalled();
    await unmount();
    expect(stop).toHaveBeenCalled();
  });

  it('does not animate with reduced motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await render(<Spinner tone='muted' />);
    await act(async () => undefined);
    expect(start).not.toHaveBeenCalled();
  });

  it('does not start after unmounting first', async () => {
    let resolve: (value: boolean) => void = () => undefined;

    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(new Promise((r) => {
      resolve = r;
    }));
    const { unmount } = await render(<Spinner />);

    await unmount();
    await act(async () => resolve(false));
    expect(start).not.toHaveBeenCalled();
  });
});
