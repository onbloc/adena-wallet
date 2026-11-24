import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { RecipientField } from '../../../../src/components/molecules';

describe('RecipientField', () => {
  it('types, clears and opens the scanner', async () => {
    const onChangeText = jest.fn();
    const onScan = jest.fn();

    await render(<RecipientField value='g1jg' onChangeText={onChangeText} onScan={onScan} />);
    const input = screen.getByLabelText('Address');

    expect(input.props.autoCorrect).toBe(false);
    expect(input.props.autoCapitalize).toBe('none');
    expect(input.props.multiline).toBeFalsy();
    await fireEvent.changeText(input, 'g1jg8m');
    await fireEvent.press(screen.getByRole('button', { name: 'Clear' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Scan QR code' }));

    expect(onChangeText.mock.calls).toEqual([['g1jg8m'], ['']]);
    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it('hides clear while empty but keeps the scan button', async () => {
    await render(<RecipientField value='' onChangeText={jest.fn()} onScan={jest.fn()} placeholder='Recipient address' />);

    expect(screen.getByLabelText('Recipient address')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Scan QR code' })).toBeTruthy();
  });
});
