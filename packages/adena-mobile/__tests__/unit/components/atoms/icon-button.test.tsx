import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import React from 'react';

import { IconButton, IconButtonVariant } from '../../../../src/components/atoms';

describe('IconButton', () => {
  it.each<IconButtonVariant>(['plain', 'surface', 'primary'])('presses the %s variant', async (variant) => {
    const onPress = jest.fn();

    await render(<IconButton icon='copy' accessibilityLabel='Copy' variant={variant} onPress={onPress} testID='ib' />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Copy' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each<IconButtonVariant>(['plain', 'surface'])('ignores presses when disabled (%s)', async (variant) => {
    const onPress = jest.fn();

    await render(<IconButton icon='close' accessibilityLabel='Close' variant={variant} disabled size={32} onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { disabled: true })).toBeTruthy();
  });

  it('never uses a negative hit slop for large sizes', async () => {
    await render(<IconButton icon='plus' accessibilityLabel='Add' size={64} />);
    expect(screen.getByRole('button').props.hitSlop).toBe(0);
  });
});
