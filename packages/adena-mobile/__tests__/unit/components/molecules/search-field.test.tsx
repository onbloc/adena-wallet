import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { SearchField } from '../../../../src/components/molecules';
import { lightColors } from '../../../../src/theme';

describe('SearchField', () => {
  it('types, focuses, blurs and clears', async () => {
    const onChangeText = jest.fn();

    await render(<SearchField value='gno' onChangeText={onChangeText} placeholder='Search tokens' />);
    const input = screen.getByLabelText('Search tokens');

    await fireEvent(input, 'focus');
    await fireEvent(input, 'blur');
    await fireEvent.changeText(input, 'gnot');
    await fireEvent.press(screen.getByRole('button', { name: 'Clear' }));
    expect(onChangeText.mock.calls).toEqual([['gnot'], ['']]);
  });

  it('hides clear for an empty value', async () => {
    await render(<SearchField value='' onChangeText={jest.fn()} placeholder='Search' />);
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('is read-only when disabled', async () => {
    const onChangeText = jest.fn();

    await render(<SearchField value='x' onChangeText={onChangeText} placeholder='Search' disabled />);
    expect(screen.getByLabelText('Search')).toHaveStyle({ color: lightColors.text.disabled });
    expect(screen.getByLabelText('Search').props.editable).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Clear' }));
    expect(onChangeText).not.toHaveBeenCalled();
  });
});
