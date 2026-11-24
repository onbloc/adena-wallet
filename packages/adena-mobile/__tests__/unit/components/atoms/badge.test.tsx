import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { Badge } from '../../../../src/components/atoms';
import { colors, StatusTone } from '../../../../src/theme';

describe('Badge', () => {
  it('defaults to the neutral tone', async () => {
    await render(<Badge label='Pending' />);
    expect(screen.getByText('Pending')).toHaveStyle({ color: colors.text.secondary });
  });

  it.each<[StatusTone, string]>([
    ['info', colors.text.primary],
    ['success', colors.status.success],
    ['warning', colors.status.warning],
    ['error', colors.status.error],
  ])('uses the %s color', async (tone, color) => {
    await render(<Badge label={tone} tone={tone} />);
    expect(screen.getByText(tone)).toHaveStyle({ color });
  });
});
