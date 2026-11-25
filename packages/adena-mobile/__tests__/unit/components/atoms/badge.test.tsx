import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { Badge } from '../../../../src/components/atoms';
import { lightColors, StatusTone } from '../../../../src/theme';

describe('Badge', () => {
  it('defaults to the neutral tone', async () => {
    await render(<Badge label='Pending' />);
    expect(screen.getByText('Pending')).toHaveStyle({ color: lightColors.text.secondary });
  });

  it.each<[StatusTone, string]>([
    ['info', lightColors.text.primary],
    ['success', lightColors.status.success],
    ['warning', lightColors.status.warning],
    ['error', lightColors.status.error],
  ])('uses the %s color', async (tone, color) => {
    await render(<Badge label={tone} tone={tone} />);
    expect(screen.getByText(tone)).toHaveStyle({ color });
  });
});
