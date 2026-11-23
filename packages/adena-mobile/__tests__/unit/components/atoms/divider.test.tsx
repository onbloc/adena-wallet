import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { Divider } from '../../../../src/components/atoms';

describe('Divider', () => {
  it('renders a line', async () => {
    await render(<Divider />);
    expect(screen.toJSON()).toBeTruthy();
  });
});
