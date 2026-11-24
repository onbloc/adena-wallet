import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import React from 'react';

import { Button, ButtonTone } from '../../../../src/components/atoms';
import { colors } from '../../../../src/theme';

describe('Button', () => {
  it.each<ButtonTone>(['primary', 'secondary', 'tertiary', 'destructive', 'destructiveOutline', 'destructiveText'])('presses with %s tone feedback', async (tone) => {
    const onPress = jest.fn();

    await render(<Button label='Go' tone={tone} leadingIcon='plus' trailingIcon='chevronRight' onPress={onPress} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Go' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('blocks presses and dims the label while disabled', async () => {
    const onPress = jest.fn();

    await render(<Button label='Disabled' disabled size='compact' fullWidth={false} onPress={onPress} testID='btn' />);
    await fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByText('Disabled')).toHaveStyle({ color: colors.text.disabled });
  });

  it.each<ButtonTone>(['primary', 'secondary'])('shows the default loading label for %s', async (tone) => {
    const onPress = jest.fn();

    await render(<Button label='Send' tone={tone} loading disabled trailingIcon='check' onPress={onPress} />);
    expect(screen.getByText('Submitting…')).toBeTruthy();
    expect(screen.getByRole('button', { busy: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('draws the destructive outline and keeps the label red', async () => {
    await render(<Button label='Disconnect' tone='destructiveOutline' testID='btn' />);
    expect(screen.getByTestId('btn')).toHaveStyle({ borderColor: colors.status.error, backgroundColor: 'transparent' });
    expect(screen.getByText('Disconnect')).toHaveStyle({ color: colors.status.error });
  });

  it('truncates long labels to one line', async () => {
    const label = 'A very long label '.repeat(20);

    await render(<Button label={label} />);
    expect(screen.getByText(label).props.numberOfLines).toBe(1);
  });
});
