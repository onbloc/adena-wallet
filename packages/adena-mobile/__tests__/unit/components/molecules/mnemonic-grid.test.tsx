import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { MnemonicGrid } from '../../../../src/components/molecules';

describe('MnemonicGrid', () => {
  it('numbers each word, including duplicates', async () => {
    await render(<MnemonicGrid words={['abandon', 'abandon', 'about']} />);
    expect(screen.getAllByText('abandon')).toHaveLength(2);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('renders an empty grid', async () => {
    await render(<MnemonicGrid words={[]} />);
    expect(screen.getByLabelText('Recovery phrase')).toBeTruthy();
  });
});
