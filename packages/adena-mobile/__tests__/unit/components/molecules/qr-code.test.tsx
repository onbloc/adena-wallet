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
    expect(screen.getByTestId('qr').props).toMatchObject({ value: 'g1abc', size: 180 });
  });

  it('accepts a custom size', async () => {
    await render(<QrCode value='g1abc' size={90} />);
    expect(screen.getByTestId('qr').props.size).toBe(90);
  });
});
