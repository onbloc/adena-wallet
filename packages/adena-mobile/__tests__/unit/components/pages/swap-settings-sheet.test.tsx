import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SwapSettingsSheet, SwapSettingsSheetProps } from '../../../../src/components/pages';
import { ColorScheme } from '../../../../src/domain/preferences';
import { themeColors } from '../../../../src/theme';
import { withScheme } from '../../../helpers/theme';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const props = (overrides: Partial<SwapSettingsSheetProps> = {}): SwapSettingsSheetProps => ({
  visible: true,
  autoSlippage: true,
  autoSlippageLabel: '0.5%',
  slippageValueLabel: '0.50%',
  deadlineValueLabel: '10 minutes',
  slippageText: '',
  deadlineText: '10',
  slippageValid: true,
  deadlineValid: true,
  canSave: false,
  onSelectAuto: jest.fn(),
  onSelectCustom: jest.fn(),
  onChangeSlippage: jest.fn(),
  onChangeDeadline: jest.fn(),
  onSave: jest.fn(),
  onClose: jest.fn(),
  ...overrides,
});

const renderSheet = (overrides: Partial<SwapSettingsSheetProps> = {}, scheme: ColorScheme = 'light') =>
  render(withScheme(scheme, <SafeAreaProvider initialMetrics={metrics}><SwapSettingsSheet {...props(overrides)} /></SafeAreaProvider>));

describe('SwapSettingsSheet', () => {
  it('shows the Auto badge, the slippage value and the deadline without row icons', async () => {
    await renderSheet();

    expect(screen.getByText('Auto')).toBeTruthy();
    expect(screen.getByText('0.50%')).toBeTruthy();
    expect(screen.getByText('10 minutes')).toBeTruthy();
    await renderSheet({ autoSlippage: false, slippageValueLabel: '1.00%' });
    expect(screen.queryByText('Auto')).toBeNull();
  });

  it('keeps Save secondary and disabled until something changed', async () => {
    const onSave = jest.fn();

    await renderSheet({ onSave });
    expect(screen.getByTestId('swap-settings-save').props.accessibilityState).toMatchObject({ disabled: true });
    await renderSheet({ onSave, canSave: true });
    await fireEvent.press(screen.getByTestId('swap-settings-save'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('goes back to the rows on Done and returns to them on reopen', async () => {
    const view = await renderSheet();

    await fireEvent.press(screen.getByTestId('swap-settings-deadline-row'));
    expect(screen.getByText('Swap deadline')).toBeTruthy();
    expect(screen.getByLabelText('Minutes').props.keyboardType).toBe('number-pad');
    await fireEvent.press(screen.getByTestId('swap-settings-done'));
    expect(screen.getByText('Swap settings')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('swap-settings-slippage-row'));
    await view.rerender(withScheme('light', <SafeAreaProvider initialMetrics={metrics}><SwapSettingsSheet {...props({ visible: false })} /></SafeAreaProvider>));
    await view.rerender(withScheme('light', <SafeAreaProvider initialMetrics={metrics}><SwapSettingsSheet {...props()} /></SafeAreaProvider>));
    expect(screen.getByText('Swap settings')).toBeTruthy();
  });

  it('opens the custom input with a decimal keyboard', async () => {
    await renderSheet({ autoSlippage: false, slippageText: '1' });

    await fireEvent.press(screen.getByTestId('swap-settings-slippage-row'));
    expect(screen.getByLabelText('Slippage (%)').props.keyboardType).toBe('decimal-pad');
    expect(screen.getByText('Auto uses 0.5%, a safe default for most pairs.')).toBeTruthy();
  });

  it.each<ColorScheme>(['light', 'dark'])('paints the Auto badge with the %s accent', async (scheme) => {
    const colors = themeColors[scheme];

    await renderSheet({}, scheme);
    const badge = screen.getByText('Auto');

    expect(badge).toHaveStyle({ color: colors.text.inverse });
    expect(StyleSheet.flatten(screen.getByTestId('swap-settings-auto-badge').props.style)).toMatchObject({ backgroundColor: colors.action.primary });
  });
});
