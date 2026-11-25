import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { InlineAlert } from '../../../../src/components/molecules';
import { lightColors, StatusTone } from '../../../../src/theme';

describe('InlineAlert', () => {
  it('defaults to info without a description', async () => {
    await render(<InlineAlert title='Heads up' />);
    expect(screen.getByText('Heads up')).toHaveStyle({ color: lightColors.text.primary });
  });

  it.each<[StatusTone, string]>([
    ['neutral', lightColors.text.primary],
    ['success', lightColors.status.success],
    ['warning', lightColors.status.warning],
    ['error', lightColors.status.error],
  ])('renders the %s tone', async (tone, color) => {
    await render(<InlineAlert title={tone} description='details' tone={tone} />);
    expect(screen.getByText(tone)).toHaveStyle({ color });
    expect(screen.getByText('details')).toBeTruthy();
  });
});
