import { render, screen, userEvent } from '@testing-library/react-native';
import React from 'react';

import { RangeSelector } from '../../../../src/components/molecules';

describe('RangeSelector', () => {
  it('marks the selected option and selects others', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();

    await render(<RangeSelector options={['1D', '1W', '1M']} selected='1W' onSelect={onSelect} />);
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('1W');
    await user.press(screen.getByRole('tab', { name: '1M' }));
    await user.press(screen.getByRole('tab', { name: '1W' }));
    expect(onSelect.mock.calls).toEqual([['1M'], ['1W']]);
  });

  it('renders no options', async () => {
    await render(<RangeSelector options={[]} selected='' onSelect={jest.fn()} />);
    expect(screen.queryByRole('tab')).toBeNull();
  });
});
