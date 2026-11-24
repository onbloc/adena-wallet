import { createNavigationContainerRef, NavigationContainer, StackActions } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React, { ReactElement, useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text } from '../../../../src/components/atoms';
import {
  BottomSheet,
  BottomSheetProps,
  isCoveredBySheet,
  resetSheetStore,
  SHEET_EXIT_MS,
  SHEET_ROUTE,
  SheetRouteParams,
  SheetScreen,
} from '../../../../src/components/molecules';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 34 } };

describe('BottomSheet without a sheet navigator', () => {
  const renderSheet = (props: Partial<BottomSheetProps> = {}) => (
    <SafeAreaProvider initialMetrics={metrics}>
      <BottomSheet visible title='Sheet title' onClose={jest.fn()} {...props}>
        <Text>Body</Text>
      </BottomSheet>
    </SafeAreaProvider>
  );

  beforeEach(() => jest.useFakeTimers());

  afterEach(() => jest.useRealTimers());

  it('renders the title as a header, the description and content, and closes from the button', async () => {
    const onClose = jest.fn();

    await render(renderSheet({ description: 'Details', onClose }));
    expect(screen.getByRole('header', { name: 'Sheet title' })).toBeTruthy();
    expect(screen.getByText('Details')).toBeTruthy();
    expect(screen.getByText('Body')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hides the close button when not dismissible', async () => {
    await render(renderSheet({ dismissible: false }));
    expect(screen.queryByLabelText('Close')).toBeNull();
  });

  it('reports onOpened when shown and onDismissed once the exit time has passed', async () => {
    const onOpened = jest.fn();
    const onDismissed = jest.fn();
    const { rerender } = await render(renderSheet({ visible: false, onOpened, onDismissed }));

    expect(screen.queryByText('Body')).toBeNull();
    await rerender(renderSheet({ onOpened, onDismissed }));
    expect(onOpened).toHaveBeenCalledTimes(1);

    await rerender(renderSheet({ visible: false, onOpened, onDismissed }));
    expect(screen.queryByText('Body')).toBeNull();
    await act(async () => jest.advanceTimersByTime(SHEET_EXIT_MS - 1));
    expect(onDismissed).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(1));
    expect(onDismissed).toHaveBeenCalledTimes(1);
  });
});

type SheetState = Partial<BottomSheetProps> & { body?: string };

describe('BottomSheet presented through the sheet route', () => {
  type ParamList = { Owner: undefined; Sheet: SheetRouteParams };
  const Stack = createNativeStackNavigator<ParamList>();
  const ref = createNavigationContainerRef<ParamList>();
  let updateSheets: (next: Record<'a' | 'b', SheetState>) => void;
  let blurs: boolean[];
  let view: Awaited<ReturnType<typeof render>>;
  const onCloseA = jest.fn();
  const onCloseB = jest.fn();

  const Owner = ({ navigation }: NativeStackScreenProps<ParamList, 'Owner'>): ReactElement => {
    const [sheets, setSheets] = useState<Record<'a' | 'b', SheetState>>({ a: {}, b: {} });

    updateSheets = setSheets;

    useEffect(() => navigation.addListener('blur', () => blurs.push(isCoveredBySheet(navigation))), [navigation]);

    return (
      <>
        <Text>Owner</Text>
        <BottomSheet visible={false} title='Sheet A' onClose={onCloseA} {...sheets.a}><Text>{sheets.a.body ?? 'Body A'}</Text></BottomSheet>
        <BottomSheet visible={false} title='Sheet B' onClose={onCloseB} {...sheets.b}><Text>Body B</Text></BottomSheet>
      </>
    );
  };

  const routeNames = (): string[] => ref.getRootState()?.routes.map(route => route.name) ?? [];

  const show = (a: SheetState, b: SheetState = {}): Promise<void> => act(async () => updateSheets({ a, b }));

  beforeEach(async () => {
    jest.useFakeTimers();
    resetSheetStore();
    onCloseA.mockReset();
    onCloseB.mockReset();
    blurs = [];
    view = await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <NavigationContainer ref={ref}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name='Owner' component={Owner} />
            <Stack.Screen name={SHEET_ROUTE} component={SheetScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>,
    );
  });

  afterEach(() => jest.useRealTimers());

  it('pushes the sheet route with the owner\'s content and pops it when hidden', async () => {
    const onDismissed = jest.fn();

    expect(screen.queryByText('Body A')).toBeNull();
    await show({ visible: true, onDismissed });
    expect(routeNames()).toEqual(['Owner', SHEET_ROUTE]);
    expect(screen.getByRole('header', { name: 'Sheet A' })).toBeTruthy();
    // A blur caused by the sheet is recognisable, so screens keep their state under it.
    expect(blurs).toEqual([true]);

    await show({ visible: true, onDismissed, body: 'Updated' });
    expect(screen.getByText('Updated')).toBeTruthy();

    await show({ visible: false, onDismissed });
    expect(routeNames()).toEqual(['Owner']);
    expect(onCloseA).not.toHaveBeenCalled();
    expect(onDismissed).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(SHEET_EXIT_MS));
    expect(onDismissed).toHaveBeenCalledTimes(1);
  });

  it('reports the native presentation start and end, and turns the iOS swipe off while not dismissible', async () => {
    const onWillOpen = jest.fn();
    const onOpened = jest.fn();

    await show({ visible: true, onWillOpen, onOpened });
    // The last native screen in the tree is the sheet route.
    const sheetScreen = (): { props: Record<string, unknown> } => view.container.queryAll(node => typeof node.props.onWillAppear === 'function').at(-1)!;

    expect(sheetScreen().props.gestureEnabled).toBe(true);
    await act(async () => (sheetScreen().props.onWillAppear as () => void)());
    expect(onWillOpen).toHaveBeenCalledTimes(1);
    expect(onOpened).not.toHaveBeenCalled();
    await act(async () => (sheetScreen().props.onAppear as () => void)());
    expect(onOpened).toHaveBeenCalledTimes(1);

    await show({ visible: true, onWillOpen, onOpened, dismissible: false });
    expect(sheetScreen().props.gestureEnabled).toBe(false);
  });

  it('closes through the owner from the close button and a native dismissal', async () => {
    await show({ visible: true });
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onCloseA).toHaveBeenCalledTimes(1);

    // Android back, a swipe or a scrim tap removes the route natively.
    await act(async () => ref.goBack());
    expect(routeNames()).toEqual(['Owner']);
    expect(onCloseA).toHaveBeenCalledTimes(2);
  });

  it('blocks back while not dismissible and brings the sheet back after an Android drag', async () => {
    await show({ visible: true, dismissible: false });
    expect(screen.queryByLabelText('Close')).toBeNull();

    await act(async () => ref.goBack());
    expect(routeNames()).toEqual(['Owner', SHEET_ROUTE]);

    // The native drag reports a pop that JS cannot refuse; the sheet presents again.
    await act(async () => ref.dispatch(StackActions.pop()));
    expect(routeNames()).toEqual(['Owner']);
    await act(async () => jest.runOnlyPendingTimers());
    expect(routeNames()).toEqual(['Owner', SHEET_ROUTE]);
    expect(onCloseA).not.toHaveBeenCalled();
  });

  it('takes the keyboard down with the sheet when the owner closes it', async () => {
    const isVisible = jest.spyOn(Keyboard, 'isVisible');
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);

    try {
      await show({ visible: true });
      isVisible.mockReturnValue(true);
      await show({ visible: false });
      expect(dismiss).toHaveBeenCalledTimes(1);

      await show({ visible: true });
      isVisible.mockReturnValue(false);
      await show({ visible: false });
      expect(dismiss).toHaveBeenCalledTimes(1);
    }
    finally {
      isVisible.mockRestore();
      dismiss.mockRestore();
    }
  });

  it('presents one sheet at a time, the next once the previous is gone', async () => {
    await show({ visible: true });
    await show({ visible: false }, { visible: true });

    expect(routeNames()).toEqual(['Owner', SHEET_ROUTE]);
    expect(screen.queryByText('Body A')).toBeNull();
    expect(screen.getByText('Body B')).toBeTruthy();

    await show({ visible: true }, { visible: true });
    expect(screen.queryByText('Body A')).toBeNull();
    await show({ visible: true }, { visible: false });
    expect(routeNames()).toEqual(['Owner', SHEET_ROUTE]);
    expect(screen.getByText('Body A')).toBeTruthy();
  });

  it('removes the sheet when its owner leaves first', async () => {
    await act(async () => ref.dispatch(StackActions.push('Owner')));
    await show({ visible: true });
    expect(routeNames()).toEqual(['Owner', 'Owner', SHEET_ROUTE]);

    // e.g. the owner navigates back in the same tick it closes its sheet.
    const state = ref.getRootState()!;

    await act(async () => ref.dispatch({ ...StackActions.pop(), source: state.routes[1].key, target: state.key }));
    expect(routeNames()).toEqual(['Owner']);
    expect(screen.queryByText('Body A')).toBeNull();
  });

  it('does not pop again when popToTop already took the sheet with its owner', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await act(async () => ref.dispatch(StackActions.push('Owner')));
    await show({ visible: true });
    await act(async () => ref.dispatch(StackActions.popToTop()));

    expect(routeNames()).toEqual(['Owner']);
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain('was not handled');
    consoleError.mockRestore();
  });
});
