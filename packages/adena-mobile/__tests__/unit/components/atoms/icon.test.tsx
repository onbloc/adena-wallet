import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { Icon } from '../../../../src/components/atoms';

describe('Icon', () => {
  it('renders with defaults and overrides', async () => {
    await render(<Icon name='home' />);
    await render(<Icon name='trash' size={12} color='#000' />);
    expect(screen.toJSON()).toBeNull();
  });
});
