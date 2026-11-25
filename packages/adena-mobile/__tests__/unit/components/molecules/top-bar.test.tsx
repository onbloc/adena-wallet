import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { Text } from '../../../../src/components/atoms';
import { TopBar } from '../../../../src/components/molecules';

describe('TopBar', () => {
  it('goes back on drill-down pages', async () => {
    const onBack = jest.fn();

    await render(<TopBar title='Settings' onBack={onBack} trailing={<Text>T</Text>} leading={<Text>L</Text>} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('header', { name: 'Settings' })).toBeTruthy();
  });

  it('renders the large modal title', async () => {
    await render(<TopBar title='Send to' variant='large' />);
    expect(screen.getByRole('header', { name: 'Send to' })).toHaveStyle({ fontSize: 34 });
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });

  it('uses the title scale on drill-down pages', async () => {
    await render(<TopBar title='Settings' onBack={jest.fn()} />);
    expect(screen.getByRole('header', { name: 'Settings' })).toHaveStyle({ fontSize: 26 });
  });

  it('renders root pages without back or title', async () => {
    const { rerender } = await render(<TopBar title='Wallet' />);

    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    await rerender(<TopBar variant='drillDown' />);
    expect(screen.queryByRole('header')).toBeNull();
  });
});
