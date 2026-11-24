import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button, Switch, Text } from '../../../src/components/atoms';
import { BottomSheet, Screen, SearchField, TextField } from '../../../src/components/molecules';
import { ColorScheme } from '../../../src/domain/preferences';
import { darkColors, lightColors, themeColors } from '../../../src/theme';
import { withScheme } from '../../helpers/theme';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const flat = (node: { props: { style?: unknown } }): Record<string, unknown> => StyleSheet.flatten(node.props.style as never) ?? {};

describe.each<ColorScheme>(['light', 'dark'])('%s scheme', (scheme) => {
  const colors = themeColors[scheme];

  it('paints the primary button with the primary action and inverse label', async () => {
    await render(withScheme(scheme, <Button label='Continue' />));
    expect(flat(screen.getByRole('button'))).toMatchObject({ backgroundColor: colors.action.primary });
    expect(screen.getByText('Continue')).toHaveStyle({ color: colors.text.inverse });
  });

  it('paints the screen with the canvas', async () => {
    await render(withScheme(scheme, <SafeAreaProvider initialMetrics={metrics}><Screen testID='screen'><Text>Body</Text></Screen></SafeAreaProvider>));
    expect(flat(screen.getByTestId('screen'))).toMatchObject({ backgroundColor: colors.background.canvas });
  });

  it('themes text field text, placeholder and keyboard', async () => {
    await render(withScheme(scheme, <TextField label='Name' placeholder='Your name' />));
    const input = screen.getByLabelText('Name');

    expect(input).toHaveStyle({ color: colors.text.primary });
    expect(input.props.placeholderTextColor).toBe(colors.text.disabled);
    expect(input.props.keyboardAppearance).toBe(scheme);
  });

  it('themes the search keyboard', async () => {
    await render(withScheme(scheme, <SearchField value='' onChangeText={jest.fn()} placeholder='Search' />));
    expect(screen.getByLabelText('Search').props.keyboardAppearance).toBe(scheme);
  });

  it('draws the bottom sheet on the surface color', async () => {
    await render(withScheme(scheme, (
      <SafeAreaProvider initialMetrics={metrics}>
        <BottomSheet visible title='Sheet' onClose={jest.fn()}><Text>Body</Text></BottomSheet>
      </SafeAreaProvider>
    )));
    expect(JSON.stringify(screen.toJSON())).toContain(colors.background.surface);
  });
});

describe('dark scheme specifics', () => {
  it('inverts the primary button to a light pill with dark text', async () => {
    await render(withScheme('dark', <Button label='Buy' />));
    expect(flat(screen.getByRole('button')).backgroundColor).toBe(darkColors.action.primary);
    expect(darkColors.action.primary).toBe(lightColors.background.subtle);
    expect(screen.getByText('Buy')).toHaveStyle({ color: darkColors.background.canvas });
  });

  it('keeps the switch knob visible on its dark track', async () => {
    await render(withScheme('dark', <Switch value={false} accessibilityLabel='Haptics' />));
    expect(JSON.stringify(screen.toJSON())).toContain(darkColors.action.thumb);
  });
});
