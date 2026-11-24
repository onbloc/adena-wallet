import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { Dialog, DialogProps } from '../../../../src/components/molecules';

const props = (overrides: Partial<DialogProps> = {}): DialogProps => ({
  visible: true,
  title: 'Remove?',
  confirmLabel: 'Remove',
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
  ...overrides,
});

describe('Dialog', () => {
  it('confirms and cancels', async () => {
    const dialog = props({ description: 'Gone forever', destructive: true, cancelLabel: 'Keep' });

    await render(<Dialog {...dialog} />);
    expect(screen.getByText('Gone forever')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Keep' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(dialog.onConfirm).toHaveBeenCalledTimes(1);
    expect(dialog.onCancel).toHaveBeenCalledTimes(2);
  });

  it('blocks confirm while loading and uses default cancel label', async () => {
    const dialog = props({ loading: true });

    await render(<Dialog {...dialog} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove' }));
    expect(dialog.onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('renders nothing when hidden', async () => {
    await render(<Dialog {...props({ visible: false })} />);
    expect(screen.queryByText('Remove?')).toBeNull();
  });
});
