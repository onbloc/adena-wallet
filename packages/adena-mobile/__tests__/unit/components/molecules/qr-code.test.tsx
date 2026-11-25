import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { QrCode } from '../../../../src/components/molecules';

jest.mock('react-native-qrcode-svg', () => {
  const { View } = jest.requireActual('react-native');

  return { __esModule: true, default: (props: object) => <View testID='qr' {...props} /> };
});

describe('QrCode', () => {
  it('passes the value and default size', async () => {
    await render(<QrCode value='g1abc' />);
    // The quiet zone is drawn inside the requested footprint, black modules on white in every theme.
    expect(screen.getByTestId('qr').props).toMatchObject({ value: 'g1abc', size: 180 - 13 * 2, color: '#000000', backgroundColor: '#FFFFFF' });
  });

  it('accepts a custom size', async () => {
    await render(<QrCode value='g1abc' size={90} />);
    expect(screen.getByTestId('qr').props.size).toBe(90 - 6 * 2);
  });
});
