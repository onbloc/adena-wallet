import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, render, screen } from '@testing-library/react-native';
import React, { ReactElement } from 'react';
import { TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PasswordSheet, PasswordSheetProps, resetSheetStore, SHEET_ROUTE, SheetRouteParams, SheetScreen } from '../../../../src/components/molecules';
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

describe('PasswordSheet focus in the native sheet', () => {
  const Stack = createNativeStackNavigator<{ Owner: undefined; Sheet: SheetRouteParams }>();
  let view: Awaited<ReturnType<typeof render>>;
  const isFocused = (): jest.Mock => (TextInput as unknown as { prototype: { isFocused: jest.Mock } }).prototype.isFocused;
  // The last native screen in the tree is the sheet route.
  const sheetScreen = (): { props: Record<string, () => void> } => view.container.queryAll(node => typeof node.props.onWillAppear === 'function').at(-1)!;

  const Owner = (): ReactElement => <PasswordSheet {...props()} />;

  beforeEach(async () => {
    resetSheetStore();
    focusMock().mockClear();
    isFocused().mockReset();
    view = await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name='Owner' component={Owner} />
            <Stack.Screen name={SHEET_ROUTE} component={SheetScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>,
    );
  });

  it('focuses as the sheet starts to present, so the keyboard rises with it', async () => {
    expect(focusMock()).not.toHaveBeenCalled();
    await act(async () => sheetScreen().props.onWillAppear());
    expect(focusedTestIds()).toEqual(['password-sheet-input']);

    isFocused().mockReturnValue(true);
    await act(async () => sheetScreen().props.onAppear());
    expect(focusMock()).toHaveBeenCalledTimes(1);
  });

  it('focuses again once settled when the early focus did not take', async () => {
    await act(async () => sheetScreen().props.onWillAppear());
    isFocused().mockReturnValue(false);
    await act(async () => sheetScreen().props.onAppear());
    expect(focusMock()).toHaveBeenCalledTimes(2);
  });
});

describe('PasswordSheet focus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    focusMock().mockClear();
  });

  afterEach(() => jest.useRealTimers());

  const settle = () => act(async () => {
    jest.runAllTimers();
  });

  it('focuses the field once when shown in place', async () => {
    await renderSheet(props());
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
