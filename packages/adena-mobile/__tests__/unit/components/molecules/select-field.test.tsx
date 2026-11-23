import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import React from 'react';

import { SelectField } from '../../../../src/components/molecules';
import { colors } from '../../../../src/theme';

describe('SelectField', () => {
  it('shows the value and opens on press', async () => {
    const onPress = jest.fn();

    await render(<SelectField label='Network' value='Mainnet' placeholder='Choose' onPress={onPress} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Network: Mainnet' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Mainnet')).toHaveStyle({ color: colors.text.primary });
  });

  it('falls back to the placeholder', async () => {
    await render(<SelectField label='Network' placeholder='Choose' />);
    expect(screen.getByRole('button', { name: 'Network: Choose' })).toBeTruthy();
    expect(screen.getByText('Choose')).toHaveStyle({ color: colors.text.disabled });
  });

  it('is inert when disabled', async () => {
    const onPress = jest.fn();

    await render(<SelectField label='Network' value='Main' placeholder='Choose' disabled onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
