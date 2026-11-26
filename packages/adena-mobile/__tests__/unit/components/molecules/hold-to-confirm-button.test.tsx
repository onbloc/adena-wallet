import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { HoldToConfirmButton } from '../../../../src/components/molecules';

describe('HoldToConfirmButton', () => {
  it('confirms on a long press only', async () => {
    const onConfirm = jest.fn();

    await render(<HoldToConfirmButton label='Hold to issue card' onConfirm={onConfirm} testID='hold' />);
    await fireEvent.press(screen.getByTestId('hold'));
    expect(onConfirm).not.toHaveBeenCalled();

    await fireEvent(screen.getByTestId('hold'), 'longPress');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('ignores holds while disabled or loading', async () => {
    const onConfirm = jest.fn();

    await render(<HoldToConfirmButton label='Hold' loading onConfirm={onConfirm} testID='hold' />);
    await fireEvent(screen.getByTestId('hold'), 'longPress');
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Submitting…')).toBeTruthy();
  });
});
