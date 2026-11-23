import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { SectionLabel } from '../../../../src/components/molecules';

describe('SectionLabel', () => {
  it('renders a header', async () => {
    await render(<SectionLabel label='Tokens' />);
    expect(screen.getByRole('header', { name: 'Tokens' })).toBeTruthy();
  });
});
