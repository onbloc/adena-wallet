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
  it.each([[[]], [[1, 2]]])('shows a skeleton while loading %p', async (values) => {
    await render(<PriceChart values={values} loading />);
    expect(screen.getByLabelText('Loading')).toBeTruthy();
  });

  it.each([[[1]], [[]]])('shows the empty label for %p', async (values) => {
    await render(<PriceChart values={values} emptyLabel='No data' />);
    expect(screen.getByText('No data')).toBeTruthy();
    expect(screen.queryByLabelText('Loading')).toBeNull();
  });

  it('draws three grid lines', async () => {
    await render(<PriceChart values={[1, 2]} accessibilityLabel='grid' />);
    await fireEvent(screen.getByLabelText('grid'), 'layout', layout(100));
    expect(screen.getAllByTestId('line')).toHaveLength(3);
  });

  it('draws only after layout and ends with a dot on the latest value', async () => {
    await render(<PriceChart values={[1, 3, 2]} accessibilityLabel='GNOT price' />);
    expect(screen.queryByTestId('svg')).toBeNull();
    await fireEvent(screen.getByLabelText('GNOT price'), 'layout', layout(120));
    expect(screen.getByTestId('svg').props.width).toBe(120);
    expect(screen.getByTestId('path').props.d).toMatch(/^M/);
    expect(screen.getByTestId('circle').props.cx).toBeGreaterThan(0);
  });

  it('dims the line under a spinner while updating', async () => {
    const { rerender } = await render(<PriceChart values={[1, 2]} updating accessibilityLabel='chart' />);

    expect(screen.getByLabelText('Updating chart')).toBeTruthy();
    expect(screen.getByLabelText('chart').props.accessibilityState).toEqual({ busy: true });
    await rerender(<PriceChart values={[1, 2]} accessibilityLabel='chart' />);
    expect(screen.queryByLabelText('Updating chart')).toBeNull();
  });

  it('handles a flat series without dividing by zero', async () => {
    await render(<PriceChart values={[5, 5, 5]} accessibilityLabel='flat' />);
    await fireEvent(screen.getByLabelText('flat'), 'layout', layout(100));
    expect(screen.getByTestId('path').props.d).not.toContain('NaN');
    expect(screen.getByTestId('circle').props.cy).toBe(60);
  });
});
