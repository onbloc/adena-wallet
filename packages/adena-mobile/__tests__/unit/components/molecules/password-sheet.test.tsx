import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PasswordSheet, PasswordSheetProps } from '../../../../src/components/molecules';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const props = (overrides: Partial<PasswordSheetProps> = {}): PasswordSheetProps => ({
  visible: true,
  title: 'Enter password',
  password: '',
  onChangePassword: jest.fn(),
  submitting: false,
  onConfirm: jest.fn(),
  onClose: jest.fn(),
  ...overrides,
});

const renderSheet = (sheet: PasswordSheetProps) => render(
  <SafeAreaProvider initialMetrics={metrics}><PasswordSheet {...sheet} /></SafeAreaProvider>,
);

describe('PasswordSheet', () => {
  it('disables confirm without a password', async () => {
    const sheet = props();

    await renderSheet(sheet);
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm', includeHiddenElements: true }));
    expect(sheet.onConfirm).not.toHaveBeenCalled();
  });

  it('types, confirms, submits from the keyboard and shows errors', async () => {
    const sheet = props({ password: 'secret', error: 'Incorrect password.', confirmLabel: 'Unlock', description: 'Needed' });

    await renderSheet(sheet);
    const input = screen.getByTestId('password-sheet-input', { includeHiddenElements: true });

    await fireEvent.changeText(input, 'secret2');
    expect(sheet.onChangePassword).toHaveBeenCalledWith('secret2');
    await fireEvent(input, 'submitEditing');
    await fireEvent.press(screen.getByRole('button', { name: 'Unlock', includeHiddenElements: true }));
    expect(sheet.onConfirm).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Incorrect password.', { includeHiddenElements: true })).toBeTruthy();
  });

  it('cannot be dismissed while submitting', async () => {
    const sheet = props({ password: 'x', submitting: true });

    await renderSheet(sheet);
    expect(screen.getByText('Verifying…', { includeHiddenElements: true })).toBeTruthy();
    const closers = screen.getAllByLabelText('Close', { includeHiddenElements: true });

    expect(closers).toHaveLength(1);
    await fireEvent.press(closers[0]);
    expect(sheet.onClose).not.toHaveBeenCalled();
  });
});
