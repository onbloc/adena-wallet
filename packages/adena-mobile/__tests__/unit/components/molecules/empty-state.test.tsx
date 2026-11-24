import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { EmptyState } from '../../../../src/components/molecules';

describe('EmptyState', () => {
  it('renders the action only with both label and handler', async () => {
    const onAction = jest.fn();
    const { rerender } = await render(<EmptyState title='Nothing' description='Add one' actionLabel='Add' onAction={onAction} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    await rerender(<EmptyState title='Nothing' actionLabel='Add' />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('Add one')).toBeNull();
  });
});
