import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { TextField } from '../../../../src/components/molecules';
import { colors } from '../../../../src/theme';

describe('TextField', () => {
  it('forwards focus and blur and shows the helper', async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();

    await render(<TextField label='Name' helper='Up to 20 characters' leadingIcon='user' onFocus={onFocus} onBlur={onBlur} />);
    await fireEvent(screen.getByLabelText('Name'), 'focus');
    await fireEvent(screen.getByLabelText('Name'), 'blur');
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Up to 20 characters')).toBeTruthy();
  });

  it('focuses without handlers', async () => {
    await render(<TextField label='Bare' multiline />);
    await fireEvent(screen.getByLabelText('Bare'), 'focus');
    await fireEvent(screen.getByLabelText('Bare'), 'blur');
    expect(screen.getByLabelText('Bare').props.multiline).toBe(true);
  });

  it('toggles secure entry', async () => {
    await render(<TextField label='Password' secure />);
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
  });

  it('prefers the error over the helper', async () => {
    await render(<TextField label='Amount' helper='h' error='Too much' />);
    expect(screen.getByText('Too much')).toHaveStyle({ color: colors.status.error });
    expect(screen.queryByText('h')).toBeNull();
  });

  it('is not editable when disabled', async () => {
    await render(<TextField label='Locked' helper='read only' disabled />);
    expect(screen.getByLabelText('Locked').props.editable).toBe(false);
    expect(screen.getByText('read only')).toHaveStyle({ color: colors.text.disabled });
  });
});
