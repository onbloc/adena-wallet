import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { Toast } from '../../../../src/components/molecules';
import { lightColors, StatusTone } from '../../../../src/theme';

describe('Toast', () => {
  it('dismisses', async () => {
    const onDismiss = jest.fn();

    await render(<Toast message='Copied' tone='success' onDismiss={onDismiss} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it.each<[StatusTone | undefined, string]>([
    [undefined, lightColors.text.primary],
    ['neutral', lightColors.text.primary],
    ['warning', lightColors.status.warning],
    ['error', lightColors.status.error],
  ])('renders tone %p without dismiss', async (tone, color) => {
    await render(<Toast message='Message' tone={tone} />);
    expect(screen.getByText('Message')).toHaveStyle({ color });
    expect(screen.queryByRole('button')).toBeNull();
  });
});
