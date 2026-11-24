import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text } from '../../../../src/components/atoms';
import { ReviewSheet, ReviewSheetProps } from '../../../../src/components/molecules';
import { FeeTier } from '../../../../src/domain/fee';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const hidden = { includeHiddenElements: true };

const props = (overrides: Partial<ReviewSheetProps> = {}): ReviewSheetProps => ({
  visible: true,
  title: 'Review',
  rows: [{ label: 'To', value: 'g1abc', multiline: true }, { label: 'Amount', value: '1 GNOT', emphasis: true }],
  fee: {
    options: [{ tier: FeeTier.AVERAGE, label: 'Average', feeLabel: '0.1 GNOT' }],
    selected: FeeTier.AVERAGE,
    onSelect: jest.fn(),
    customAdjustment: '1',
    onChangeCustomAdjustment: jest.fn(),
    tooLow: false,
  },
  confirmLabel: 'Send',
  confirming: false,
  onConfirm: jest.fn(),
  onClose: jest.fn(),
  ...overrides,
});

const renderSheet = (sheet: ReviewSheetProps) => render(
  <SafeAreaProvider initialMetrics={metrics}><ReviewSheet {...sheet}><Text>Summary</Text></ReviewSheet></SafeAreaProvider>,
);

describe('ReviewSheet', () => {
  it('renders rows and confirms', async () => {
    const sheet = props();

    await renderSheet(sheet);
    expect(screen.getByText('Summary', hidden)).toBeTruthy();
    expect(screen.getByText('g1abc', hidden)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('review-confirm', hidden));
    expect(sheet.onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Transaction failed', hidden)).toBeNull();
  });

  it('renders the totals below the fee', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ReviewSheet {...props()} totals={<Text>Total 1.1 GNOT</Text>} />
      </SafeAreaProvider>,
    );
    expect(screen.getByText('Total 1.1 GNOT', hidden)).toBeTruthy();
  });

  it('shows the error and blocks confirm when the fee is too low', async () => {
    const base = props();
    const sheet = props({ error: 'Out of gas', fee: { ...base.fee, tooLow: true } });

    await renderSheet(sheet);
    expect(screen.getByText('Out of gas', hidden)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('review-confirm', hidden));
    expect(sheet.onConfirm).not.toHaveBeenCalled();
  });

  it('shows the broadcasting state and is not dismissible', async () => {
    await renderSheet(props({ confirming: true }));
    expect(screen.getByText('Broadcasting…', hidden)).toBeTruthy();
    expect(screen.getAllByLabelText('Close', hidden)).toHaveLength(1);
  });
});
