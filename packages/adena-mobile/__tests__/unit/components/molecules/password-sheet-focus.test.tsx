import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PasswordSheet, PasswordSheetProps } from '../../../../src/components/molecules';
import { focusedTestIds, focusMock } from '../../../helpers/focus';

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

const wrap = (sheet: PasswordSheetProps) => <SafeAreaProvider initialMetrics={metrics}><PasswordSheet {...sheet} /></SafeAreaProvider>;

const renderSheet = (sheet: PasswordSheetProps) => render(wrap(sheet));

describe('PasswordSheet focus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    focusMock().mockClear();
  });

  afterEach(() => jest.useRealTimers());

  const settle = () => act(async () => {
    jest.runAllTimers();
  });

  it('focuses the field once the sheet has slid in, not while it slides', async () => {
    await renderSheet(props());
    expect(focusMock()).not.toHaveBeenCalled();
    await settle();
    expect(focusedTestIds()).toEqual(['password-sheet-input']);
  });

  it('waits for a focus request when a gate decides (biometrics first), then focuses on each request', async () => {
    const { rerender } = await renderSheet(props({ focusRequest: 0 }));

    await settle();
    expect(focusMock()).not.toHaveBeenCalled();
    await rerender(wrap(props({ focusRequest: 1 })));
    expect(focusMock()).toHaveBeenCalledTimes(1);
    await rerender(wrap(props({ focusRequest: 1, password: 'typing' })));
    expect(focusMock()).toHaveBeenCalledTimes(1);
    await rerender(wrap(props({ focusRequest: 2 })));
    expect(focusMock()).toHaveBeenCalledTimes(2);
  });

  it('holds a focus request until a running check finishes', async () => {
    const { rerender } = await renderSheet(props({ focusRequest: 0, submitting: true }));

    await settle();
    await rerender(wrap(props({ focusRequest: 1, submitting: true })));
    expect(focusMock()).not.toHaveBeenCalled();
    await rerender(wrap(props({ focusRequest: 1, submitting: false })));
    expect(focusMock()).toHaveBeenCalledTimes(1);
  });

  it('does not reuse an old request when reopened', async () => {
    const { rerender } = await renderSheet(props({ focusRequest: 3 }));

    await settle();
    await rerender(wrap(props({ visible: false, focusRequest: 3 })));
    await settle();
    await rerender(wrap(props({ visible: true, focusRequest: 3 })));
    await settle();
    expect(focusMock()).not.toHaveBeenCalled();
  });

  it('uses a done key that submits without dropping the keyboard', async () => {
    await renderSheet(props());
    expect(screen.getByTestId('password-sheet-input', { includeHiddenElements: true }).props).toMatchObject({
      returnKeyType: 'done',
      submitBehavior: 'submit',
      secureTextEntry: true,
      autoCorrect: false,
      autoCapitalize: 'none',
    });
  });
});
