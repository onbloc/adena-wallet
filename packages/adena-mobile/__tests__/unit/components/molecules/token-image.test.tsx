import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { TokenImage } from '../../../../src/components/molecules';

jest.mock('react-native-svg', () => {
  const { View } = jest.requireActual('react-native');

  return { __esModule: true, default: View, SvgUri: (props: object) => <View testID='svg-uri' {...props} /> };
});

describe('TokenImage', () => {
  it('uses the bundled icon first', async () => {
    const { container } = await render(<TokenImage symbol='GNOT' localIcon='gnot' imageUrl='https://x.io/a.png' />);

    expect(container.queryAll(node => node.type === 'Image')).toHaveLength(0);
    expect(screen.queryByText('G')).toBeNull();
  });

  it('falls back to the monogram when a remote SVG fails', async () => {
    await render(<TokenImage symbol='atom' imageUrl='https://x.io/a.svg' size={24} />);
    await fireEvent(screen.getByTestId('svg-uri'), 'error');
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('falls back to the monogram when a raster fails', async () => {
    const { container } = await render(<TokenImage symbol='foo' imageUrl='https://x.io/a.png' />);

    await fireEvent(container.queryAll(node => node.type === 'Image')[0], 'error');
    expect(screen.getByText('F')).toBeTruthy();
  });

  it('shows the unknown token art without a symbol', async () => {
    await render(<TokenImage symbol='' />);
    expect(screen.queryByText(/./)).toBeNull();
  });
});
