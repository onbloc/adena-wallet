import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { Toast } from '../../../../src/components/molecules';
import { colors, StatusTone } from '../../../../src/theme';

describe('Toast', () => {
  it('dismisses', async () => {
    const onDismiss = jest.fn();

    await render(<Toast message='Copied' tone='success' onDismiss={onDismiss} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it.each<[StatusTone | undefined, string]>([
    [undefined, colors.text.primary],
    ['neutral', colors.text.primary],
    ['warning', colors.status.warning],
    ['error', colors.status.error],
  ])('renders tone %p without dismiss', async (tone, color) => {
    await render(<Toast message='Message' tone={tone} />);
    expect(screen.getByText('Message')).toHaveStyle({ color });
    expect(screen.queryByRole('button')).toBeNull();
  });
});
