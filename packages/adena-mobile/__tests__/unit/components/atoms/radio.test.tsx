import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { Radio } from '../../../../src/components/atoms';

describe('Radio', () => {
  it('selects on press', async () => {
    const onSelect = jest.fn();
    const { rerender } = await render(<Radio label='One' selected={false} onSelect={onSelect} />);

    await fireEvent.press(screen.getByRole('radio'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    await rerender(<Radio label='One' selected onSelect={onSelect} />);
    expect(screen.getByRole('radio', { selected: true })).toBeTruthy();
  });

  it.each([true, false])('is inert when disabled (selected=%s)', async (selected) => {
    const onSelect = jest.fn();

    await render(<Radio label='Two' selected={selected} disabled onSelect={onSelect} />);
    await fireEvent.press(screen.getByRole('radio'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
