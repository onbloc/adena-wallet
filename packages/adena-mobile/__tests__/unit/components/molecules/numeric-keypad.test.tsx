import { render, screen, userEvent } from '@testing-library/react-native';
import React from 'react';

import { applyKeypadKey, KeypadKey, NumericKeypad } from '../../../../src/components/molecules';

describe('NumericKeypad', () => {
  it('reports every key with accessible labels', async () => {
    const onKeyPress = jest.fn();
    const user = userEvent.setup();

    await render(<NumericKeypad onKeyPress={onKeyPress} />);
    await user.press(screen.getByLabelText('Decimal point'));
    await user.press(screen.getByLabelText('Delete'));
    await user.press(screen.getByLabelText('7'));
    expect(onKeyPress.mock.calls.map(call => call[0])).toEqual(['.', 'backspace', '7']);
    expect(screen.getAllByRole('keyboardkey')).toHaveLength(12);
  });
});

describe('applyKeypadKey', () => {
  it.each<[string, KeypadKey, number, string]>([
    ['12', 'backspace', 6, '1'],
    ['', 'backspace', 6, ''],
    ['', '.', 6, '0.'],
    ['3', '.', 6, '3.'],
    ['3.1', '.', 6, '3.1'],
    ['3', '.', 0, '3'],
    ['0', '5', 6, '5'],
    ['0', '0', 6, '0'],
    ['', '0', 6, '0'],
    ['0.', '5', 6, '0.5'],
    ['1.123456', '7', 6, '1.123456'],
    ['1.12', '7', 2, '1.12'],
    ['1.1', '7', 2, '1.17'],
    ['9'.repeat(24), '1', 6, '9'.repeat(24)],
    ['9'.repeat(23), '1', 6, `${'9'.repeat(23)}1`],
  ])('%p + %p (max %p) → %p', (current, key, max, expected) => {
    expect(applyKeypadKey(current, key, max)).toBe(expected);
  });
});
