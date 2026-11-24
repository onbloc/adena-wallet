import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text } from '../../../../src/components/atoms';
import { BottomSheet, BottomSheetProps } from '../../../../src/components/molecules';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 34 } };

const renderSheet = (props: Partial<BottomSheetProps> = {}) => (
  <SafeAreaProvider initialMetrics={metrics}>
    <BottomSheet visible title='Sheet title' onClose={jest.fn()} {...props}>
      <Text>Body</Text>
    </BottomSheet>
  </SafeAreaProvider>
);

describe('BottomSheet', () => {
  beforeEach(() => jest.useFakeTimers());

  afterEach(() => jest.useRealTimers());

  it('renders the title, description and content, and closes from the button and scrim', async () => {
    const onClose = jest.fn();

    await render(renderSheet({ description: 'Details', onClose }));
    expect(screen.getByText('Sheet title')).toBeTruthy();
    expect(screen.getByText('Details')).toBeTruthy();
    expect(screen.getByText('Body')).toBeTruthy();

    const closers = screen.getAllByLabelText('Close', { includeHiddenElements: true });

    await fireEvent.press(closers[0]);
    await fireEvent.press(closers[1]);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('stays mounted during the exit animation and unmounts when it finishes', async () => {
    const { rerender } = await render(renderSheet());

    await rerender(renderSheet({ visible: false }));
    expect(screen.getByText('Body')).toBeTruthy();
    await act(async () => {
      jest.runAllTimers();
    });
    expect(screen.queryByText('Body')).toBeNull();

    await rerender(renderSheet({ visible: true }));
    expect(screen.getByText('Body')).toBeTruthy();
  });

  it('does not mount while hidden', async () => {
    await render(renderSheet({ visible: false }));
    expect(screen.queryByText('Body')).toBeNull();
  });

  it('hides the close button and blocks dismissal when not dismissible', async () => {
    const onClose = jest.fn();

    await render(renderSheet({ dismissible: false, onClose }));
    const closers = screen.getAllByLabelText('Close', { includeHiddenElements: true });

    expect(closers).toHaveLength(1);
    await fireEvent.press(closers[0]);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reports onDismissed after the exit animation on Android', async () => {
    const original = Platform.OS;
    const onDismissed = jest.fn();

    Platform.OS = 'android';

    try {
      const { rerender } = await render(renderSheet({ onDismissed }));

      await rerender(renderSheet({ visible: false, onDismissed }));
      expect(onDismissed).not.toHaveBeenCalled();
      await act(async () => {
        jest.runAllTimers();
      });
      expect(onDismissed).toHaveBeenCalledTimes(1);
    }
    finally {
      Platform.OS = original;
    }
  });

  it('leaves onDismissed to the iOS modal once the exit animation ends', async () => {
    const onDismissed = jest.fn();
    const { rerender } = await render(renderSheet({ onDismissed }));

    await rerender(renderSheet({ visible: false, onDismissed }));
    await act(async () => {
      jest.runAllTimers();
    });
    expect(onDismissed).not.toHaveBeenCalled();
  });
});
