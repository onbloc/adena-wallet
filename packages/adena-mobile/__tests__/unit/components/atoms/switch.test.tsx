import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { Switch } from '../../../../src/components/atoms';

describe('Switch', () => {
  it.each([true, false])('toggles from %s', async (value) => {
    const onValueChange = jest.fn();

    await render(<Switch value={value} accessibilityLabel='Biometrics' onValueChange={onValueChange} />);
    await fireEvent.press(screen.getByRole('switch', { name: 'Biometrics' }));
    expect(onValueChange).toHaveBeenCalledWith(!value);
  });

  it('animates when the value changes and tolerates no handler', async () => {
    const { rerender } = await render(<Switch value={false} accessibilityLabel='S' />);

    await rerender(<Switch value accessibilityLabel='S' />);
    expect(screen.getByRole('switch', { checked: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('switch'));
  });

  it('is inert when disabled', async () => {
    const onValueChange = jest.fn();

    await render(<Switch value disabled accessibilityLabel='S' onValueChange={onValueChange} />);
    await fireEvent.press(screen.getByRole('switch'));
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
