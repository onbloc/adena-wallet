import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { NftCard } from '../../../../src/components/molecules';

jest.mock('react-native-svg', () => {
  const { View } = jest.requireActual('react-native');

  return { __esModule: true, default: View, SvgUri: View, SvgXml: View };
});

describe('NftCard', () => {
  it('presses and shows the subtitle', async () => {
    const onPress = jest.fn();

    await render(<NftCard title='Punk #1' subtitle='Punks' imageUri='https://x.io/a.png' onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Punk #1' }));
    expect(onPress).toHaveBeenCalled();
    expect(screen.getByText('Punks')).toBeTruthy();
  });

  it('shows a loading image without subtitle', async () => {
    await render(<NftCard title='Loading' imageLoading />);
    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);
  });
});
