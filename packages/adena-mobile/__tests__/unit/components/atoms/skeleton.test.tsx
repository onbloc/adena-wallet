import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Animated } from 'react-native';

import { Skeleton } from '../../../../src/components/atoms';

describe('Skeleton', () => {
  it('pulses while mounted and stops on unmount', async () => {
    const stop = jest.fn();
    const loop = jest.spyOn(Animated, 'loop').mockReturnValue({ start: jest.fn(), stop, reset: jest.fn() });
    const { unmount } = await render(<Skeleton />);

    expect(screen.getByLabelText('Loading')).toHaveStyle({ width: '100%', height: 16 });
    await unmount();
    expect(stop).toHaveBeenCalled();
    loop.mockRestore();
  });

  it('accepts custom dimensions and rounding', async () => {
    await render(<Skeleton width={40} height={40} rounded />);
    expect(screen.getByLabelText('Loading')).toHaveStyle({ width: 40, height: 40 });
  });
});
