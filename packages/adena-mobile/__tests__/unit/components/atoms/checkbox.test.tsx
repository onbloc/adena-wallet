import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { Checkbox, CheckboxValue } from '../../../../src/components/atoms';

describe('Checkbox', () => {
  it.each<[CheckboxValue, boolean]>([['off', true], ['on', false], ['mixed', true]])('toggles from %s to %s', async (value, next) => {
    const onChange = jest.fn();

    await render(<Checkbox label='Agree' value={value} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(next);
  });

  it('exposes the checked state', async () => {
    const { rerender } = await render(<Checkbox label='A' value='mixed' />);

    expect(screen.getByRole('checkbox', { checked: 'mixed' })).toBeTruthy();
    await rerender(<Checkbox label='A' value='on' />);
    expect(screen.getByRole('checkbox', { checked: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox'));
  });

  it.each<CheckboxValue>(['off', 'on', 'mixed'])('is inert when disabled (%s)', async (value) => {
    const onChange = jest.fn();

    await render(<Checkbox label='Locked' value={value} disabled onChange={onChange} />);
    await fireEvent.press(screen.getByRole('checkbox'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
