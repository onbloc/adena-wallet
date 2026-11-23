import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { InlineAlert } from '../../../../src/components/molecules';
import { colors, StatusTone } from '../../../../src/theme';

describe('InlineAlert', () => {
  it('defaults to info without a description', async () => {
    await render(<InlineAlert title='Heads up' />);
    expect(screen.getByText('Heads up')).toHaveStyle({ color: colors.text.primary });
  });

  it.each<[StatusTone, string]>([
    ['neutral', colors.text.primary],
    ['success', colors.status.success],
    ['warning', colors.status.warning],
    ['error', colors.status.error],
  ])('renders the %s tone', async (tone, color) => {
    await render(<InlineAlert title={tone} description='details' tone={tone} />);
    expect(screen.getByText(tone)).toHaveStyle({ color });
    expect(screen.getByText('details')).toBeTruthy();
  });
});
