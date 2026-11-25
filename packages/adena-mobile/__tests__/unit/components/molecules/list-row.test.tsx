import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import React from 'react';

import { Text } from '../../../../src/components/atoms';
import { ListRow } from '../../../../src/components/molecules';
import { lightColors } from '../../../../src/theme';

describe('ListRow', () => {
  it('renders a static row without a chevron by default', async () => {
    await render(<ListRow label='Version' value='1.0' testID='row' leading={<Text>L</Text>} trailing={<Text>T</Text>} />);
    expect(screen.getByTestId('row')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('L')).toBeTruthy();
  });

  it('presses an interactive row with all parts', async () => {
    const onPress = jest.fn();

    await render(<ListRow label='Network' description='Mainnet' value='Gno' valueColor='success' leadingIcon='globe' onPress={onPress} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Network, Mainnet, Gno' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Gno')).toHaveStyle({ color: lightColors.status.success });
  });

  it('is inert and dimmed when disabled', async () => {
    const onPress = jest.fn();

    await render(<ListRow label='Off' description='d' value='v' leadingIcon='lock' disabled showChevron onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByText('Off')).toHaveStyle({ color: lightColors.text.disabled });
    expect(screen.getByText('v')).toHaveStyle({ color: lightColors.text.disabled });
  });

  it('colors destructive labels', async () => {
    await render(<ListRow label='Delete' destructive showChevron={false} onPress={jest.fn()} />);
    expect(screen.getByText('Delete')).toHaveStyle({ color: lightColors.status.error });
  });
});
