import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '../../../src/app/toast-host';
import { HapticKind } from '../../../src/domain/haptics';
import { HapticsContext } from '../../../src/hooks/use-haptics';
import { useToastStore } from '../../../src/stores/toast.store';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 20 } };
const renderHost = () => render(<SafeAreaProvider initialMetrics={metrics}><ToastHost /></SafeAreaProvider>);

describe('ToastHost', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useToastStore.setState({ toast: null });
  });

  afterEach(() => jest.useRealTimers());

  it('renders nothing without a toast', async () => {
    await renderHost();
    expect(screen.queryByText(/./)).toBeNull();
  });

  it('auto-dismisses after 3 seconds', async () => {
    await renderHost();
    await act(async () => useToastStore.getState().show('Copied', 'success'));
    expect(screen.getByText('Copied')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(2999);
    });
    expect(screen.getByText('Copied')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Copied')).toBeNull();
  });

  it('restarts the timer for a new toast and dismisses on press', async () => {
    await renderHost();
    await act(async () => useToastStore.getState().show('First'));
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    await act(async () => useToastStore.getState().show('Second', 'error'));
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByText('Second')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Dismiss' }));
    expect(useToastStore.getState().toast).toBeNull();
  });
});

describe('ToastHost haptics', () => {
  it('plays a success haptic for success toasts only', async () => {
    const play = jest.fn();

    await render(<SafeAreaProvider initialMetrics={metrics}><HapticsContext value={play}><ToastHost /></HapticsContext></SafeAreaProvider>);
    await act(async () => useToastStore.getState().show('Failed', 'error'));
    expect(play).not.toHaveBeenCalled();
    await act(async () => useToastStore.getState().show('Transaction confirmed', 'success'));
    expect(play).toHaveBeenCalledWith(HapticKind.SUCCESS);
    useToastStore.setState({ toast: null });
  });
});
