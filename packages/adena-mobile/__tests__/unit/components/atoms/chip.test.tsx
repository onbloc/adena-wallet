import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import React from 'react';

import { Chip } from '../../../../src/components/atoms';

describe('Chip', () => {
  it('fires onPress and shows pressed feedback', async () => {
    const onPress = jest.fn();

    await render(<Chip label='Fast' trailingIcon='check' onPress={onPress} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Fast' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reflects the selected state', async () => {
    await render(<Chip label='Slow' selected />);
    expect(screen.getByRole('button', { selected: true })).toBeTruthy();
  });

  it('ignores presses while disabled', async () => {
    const onPress = jest.fn();

    await render(<Chip label='Custom' disabled selected onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { disabled: true })).toBeTruthy();
  });
});
