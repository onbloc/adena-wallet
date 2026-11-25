import { render, screen, userEvent } from '@testing-library/react-native';
import React from 'react';

import { ActivityRow } from '../../../../src/components/molecules';
import { lightColors } from '../../../../src/theme';

describe('ActivityRow', () => {
  it('renders a successful row with amount and press feedback', async () => {
    const onPress = jest.fn();

    await render(<ActivityRow title='Receive' description='From g1' amountLabel='+2 GNOT' tone='positive' failed={false} icon='plus' onPress={onPress} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Receive, From g1, +2 GNOT' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('+2 GNOT')).toHaveStyle({ color: lightColors.status.success });
  });

  it('marks failed rows and appends extra info', async () => {
    await render(<ActivityRow title='Call' extraInfo='Transfer' tone='muted' failed icon='link' />);
    expect(screen.getByRole('button', { name: 'Call, Failed' })).toBeTruthy();
    expect(screen.getByText('Call Transfer')).toBeTruthy();
    expect(screen.getByText('Failed')).toBeTruthy();
  });

  it('uses the muted and default amount colors', async () => {
    const { rerender } = await render(<ActivityRow title='A' amountLabel='1' tone='muted' failed={false} icon='swap' />);

    expect(screen.getByText('1')).toHaveStyle({ color: lightColors.text.disabled });
    await rerender(<ActivityRow title='A' amountLabel='1' tone='default' failed={false} icon='swap' />);
    expect(screen.getByText('1')).toHaveStyle({ color: lightColors.text.primary });
  });
});
