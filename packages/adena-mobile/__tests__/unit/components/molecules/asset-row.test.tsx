import { render, screen, userEvent } from '@testing-library/react-native';
import React from 'react';

import { Text } from '../../../../src/components/atoms';
import { AssetRow } from '../../../../src/components/molecules';
import { Trend } from '../../../../src/components/view-models';
import { colors } from '../../../../src/theme';

describe('AssetRow', () => {
  it('renders values and presses', async () => {
    const onPress = jest.fn();

    await render(
      <AssetRow name='Gno.land' quantity='1 GNOT' value='$1.00' change={{ label: '+1%', trend: Trend.POSITIVE }} icon={<Text>i</Text>} onPress={onPress} />,
    );
    expect(screen.getByText('+1%')).toHaveStyle({ color: colors.status.success });
    await userEvent.setup().press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each([[Trend.NEGATIVE, colors.status.error], [Trend.NEUTRAL, colors.text.secondary]])('colors the %s trend', async (trend, color) => {
    await render(<AssetRow name='A' change={{ label: 'chg', trend }} icon={null} />);
    expect(screen.getByText('chg')).toHaveStyle({ color });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows skeletons while loading and hides the change', async () => {
    await render(<AssetRow name='A' quantity='1' value='$1' change={{ label: 'chg', trend: Trend.POSITIVE }} icon={null} loading />);
    expect(screen.getAllByLabelText('Loading')).toHaveLength(2);
    expect(screen.queryByText('chg')).toBeNull();
    expect(screen.queryByText('$1')).toBeNull();
  });

  it('renders without quantity or value', async () => {
    await render(<AssetRow name='Bare' icon={null} />);
    expect(screen.getByText('Bare')).toBeTruthy();
  });
});
