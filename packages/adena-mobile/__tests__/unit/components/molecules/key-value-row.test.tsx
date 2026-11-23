import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { KeyValueRow } from '../../../../src/components/molecules';

describe('KeyValueRow', () => {
  it('right-aligns single-line values', async () => {
    await render(<KeyValueRow label='Fee' value='0.1 GNOT' />);
    expect(screen.getByText('0.1 GNOT')).toHaveStyle({ textAlign: 'right' });
  });

  it('stacks multiline emphasized values', async () => {
    const value = 'g1'.repeat(100);

    await render(<KeyValueRow label='Address' value={value} multiline emphasis />);
    expect(screen.getByText(value)).toHaveStyle({ textAlign: 'left' });
  });
});
