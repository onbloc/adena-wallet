import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { FeeSelector, FeeSelectorProps } from '../../../../src/components/molecules';
import { FeeTier } from '../../../../src/domain/fee';

const props = (overrides: Partial<FeeSelectorProps> = {}): FeeSelectorProps => ({
  options: [
    { tier: FeeTier.SLOW, label: 'Slow', feeLabel: '0.1 GNOT' },
    { tier: FeeTier.AVERAGE, label: 'Average', feeLabel: '0.2 GNOT' },
    { tier: FeeTier.CUSTOM, label: 'Custom', feeLabel: '0.3 GNOT' },
  ],
  selected: FeeTier.AVERAGE,
  onSelect: jest.fn(),
  customAdjustment: '1.5',
  onChangeCustomAdjustment: jest.fn(),
  tooLow: false,
  ...overrides,
});

describe('FeeSelector', () => {
  it('shows the selected fee and selects tiers', async () => {
    const selector = props();

    await render(<FeeSelector {...selector} />);
    expect(screen.getByText('0.2 GNOT')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Slow' }));
    expect(selector.onSelect).toHaveBeenCalledWith(FeeTier.SLOW);
    expect(screen.queryByLabelText('Gas multiplier')).toBeNull();
    expect(screen.queryByText('Network fee too low')).toBeNull();
  });

  it('edits the custom multiplier and warns when too low', async () => {
    const selector = props({ selected: FeeTier.CUSTOM, tooLow: true });

    await render(<FeeSelector {...selector} />);
    await fireEvent.changeText(screen.getByLabelText('Gas multiplier'), '0.5');
    expect(selector.onChangeCustomAdjustment).toHaveBeenCalledWith('0.5');
    expect(screen.getByText('Network fee too low')).toBeTruthy();
  });

  it('handles no options', async () => {
    await render(<FeeSelector {...props({ options: [] })} />);
    expect(screen.getByText('Network fee')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
