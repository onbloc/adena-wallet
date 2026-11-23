import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { PriceChart } from '../../../../src/components/molecules';

jest.mock('react-native-svg', () => {
  const { View } = jest.requireActual('react-native');
  const make = (name: string) => (props: object) => <View testID={name} {...props} />;

  return { __esModule: true, default: make('svg'), Circle: make('circle'), Line: make('line'), Path: make('path') };
});

const layout = (width: number) => ({ nativeEvent: { layout: { width, height: 200, x: 0, y: 0 } } });

describe('PriceChart', () => {
  it.each([[[1], false], [[], false], [[1, 2], true]])('shows a skeleton for %p (loading=%p)', async (values, loading) => {
    await render(<PriceChart values={values} loading={loading} />);
    expect(screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('draws only after layout and ends with a dot on the latest value', async () => {
    await render(<PriceChart values={[1, 3, 2]} accessibilityLabel='GNOT price' />);
    expect(screen.queryByTestId('svg')).toBeNull();
    await fireEvent(screen.getByLabelText('GNOT price'), 'layout', layout(120));
    expect(screen.getByTestId('svg').props.width).toBe(120);
    expect(screen.getByTestId('path').props.d).toMatch(/^M/);
    expect(screen.getByTestId('circle').props.cx).toBeGreaterThan(0);
  });

  it('handles a flat series without dividing by zero', async () => {
    await render(<PriceChart values={[5, 5, 5]} accessibilityLabel='flat' />);
    await fireEvent(screen.getByLabelText('flat'), 'layout', layout(100));
    expect(screen.getByTestId('path').props.d).not.toContain('NaN');
  });
});
