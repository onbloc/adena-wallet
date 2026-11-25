import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import React from 'react';

import { Button, ButtonTone } from '../../../../src/components/atoms';
import { HapticKind } from '../../../../src/domain/haptics';
import { HapticsContext } from '../../../../src/hooks/use-haptics';
import { lightColors } from '../../../../src/theme';

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
    expect(screen.getByText('Disabled')).toHaveStyle({ color: lightColors.text.disabled });
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
    expect(screen.getByTestId('btn')).toHaveStyle({ borderColor: lightColors.status.error, backgroundColor: 'transparent' });
    expect(screen.getByText('Disconnect')).toHaveStyle({ color: lightColors.status.error });
  });

  it('truncates long labels to one line', async () => {
    const label = 'A very long label '.repeat(20);

    await render(<Button label={label} />);
    expect(screen.getByText(label).props.numberOfLines).toBe(1);
  });
});

describe('Button haptics', () => {
  it.each<[ButtonTone, boolean | undefined, number]>([
    ['primary', undefined, 1],
    ['destructive', undefined, 1],
    ['secondary', undefined, 0],
    ['secondary', true, 1],
    ['primary', false, 0],
  ])('plays a light impact for %s (haptic=%s)', async (tone, haptic, expected) => {
    const play = jest.fn();
    const onPress = jest.fn();

    await render(<HapticsContext value={play}><Button label='Go' tone={tone} haptic={haptic} onPress={onPress} /></HapticsContext>);
    await fireEvent.press(screen.getByRole('button', { name: 'Go' }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(expected);

    if (expected) {
      expect(play).toHaveBeenCalledWith(HapticKind.IMPACT);
    }
  });
});
