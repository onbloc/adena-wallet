import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { Avatar } from '../../../../src/components/atoms';
import { getInitials } from '../../../../src/utils/address';

describe('Avatar', () => {
  it('renders initials with the default and a custom size', async () => {
    const { rerender } = await render(<Avatar name='Adena Wallet' />);

    expect(screen.getByText(getInitials('Adena Wallet'))).toBeTruthy();
    await rerender(<Avatar name='x' size={48} />);
    expect(screen.getByText(getInitials('x'))).toBeTruthy();
  });

  it('handles an empty name', async () => {
    await render(<Avatar name='' />);
    expect(screen.toJSON()).toBeTruthy();
  });
});
