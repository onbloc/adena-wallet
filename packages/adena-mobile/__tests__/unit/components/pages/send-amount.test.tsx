import { fireEvent, screen, within } from '@testing-library/react-native';
import React from 'react';

import { SendAmountPage, SendAmountPageProps, TransferReview } from '../../../../src/components/pages';
import { FeeTier } from '../../../../src/domain/fee';
import { renderPage } from './render-page';

const recipient = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const review = (overrides: Partial<TransferReview> = {}): TransferReview => ({
  amountLabel: '12.5 GNOT',
  recipientAddress: recipient,
  networkName: 'Gno.land',
  totalLabel: '12.5001 GNOT',
  fee: {
    options: [
      { tier: FeeTier.SLOW, label: 'Slow', feeLabel: '0.00005 GNOT' },
      { tier: FeeTier.AVERAGE, label: 'Average', feeLabel: '0.0001 GNOT' },
    ],
    selected: FeeTier.AVERAGE,
    onSelect: jest.fn(),
    customAdjustment: '',
    onChangeCustomAdjustment: jest.fn(),
    tooLow: false,
  },
  ...overrides,
});

const props = (overrides: Partial<SendAmountPageProps> = {}): SendAmountPageProps => ({
  amount: '12.5',
  symbol: 'GNOT',
  available: '1,000',
  recipientAddress: recipient,
  recipientLabel: 'Alice',
  canReview: true,
  preparing: false,
  onKeyPress: jest.fn(),
  onMax: jest.fn(),
  onReview: jest.fn(),
  onBack: jest.fn(),
  confirming: false,
  onConfirm: jest.fn(),
  onCloseReview: jest.fn(),
  memo: '',
  onChangeMemo: jest.fn(),
  memoSheetVisible: false,
  onOpenMemo: jest.fn(),
  onCloseMemo: jest.fn(),
  tokenOptions: [
    { key: 'ugnot', symbol: 'GNOT', name: 'Gno.land', balanceLabel: '1,000 GNOT' },
    { key: 'gns', symbol: 'GNS', name: 'Gnoswap' },
  ],
  tokenPickerVisible: false,
  onOpenTokenPicker: jest.fn(),
  onCloseTokenPicker: jest.fn(),
  onSelectToken: jest.fn(),
  ...overrides,
});

describe('SendAmountPage', () => {
  it('renders the amount form and reports keypad, max, memo, picker, review and back', async () => {
    const page = props();

    await renderPage(<SendAmountPage {...page} />);

    expect(screen.getByText('12.5')).toBeTruthy();
    expect(screen.getByText('Available 1,000 GNOT')).toBeTruthy();
    expect(screen.getByText('g1jg8m…sqf5')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Memo, Optional' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('keyboardkey', { name: '7' }));
    await fireEvent.press(screen.getByRole('keyboardkey', { name: 'Decimal point' }));
    await fireEvent.press(screen.getByRole('keyboardkey', { name: 'Delete' }));
    await fireEvent.press(screen.getByText('Max'));
    await fireEvent.press(screen.getByText('GNOT'));
    await fireEvent.press(screen.getByRole('button', { name: 'Memo, Optional' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onKeyPress).toHaveBeenNthCalledWith(1, '7');
    expect(page.onKeyPress).toHaveBeenNthCalledWith(2, '.');
    expect(page.onKeyPress).toHaveBeenNthCalledWith(3, 'backspace');
    expect(page.onMax).toHaveBeenCalledTimes(1);
    expect(page.onOpenTokenPicker).toHaveBeenCalledTimes(1);
    expect(page.onOpenMemo).toHaveBeenCalledTimes(1);
    expect(page.onReview).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Confirm send')).toBeNull();
  });

  it('shows placeholders, the error and blocks review while unavailable', async () => {
    const page = props({ amount: '', available: undefined, canReview: false, error: 'Insufficient balance' });

    await renderPage(<SendAmountPage {...page} />);

    expect(screen.getAllByText('0')).toHaveLength(2);
    expect(screen.getByText('Available … GNOT')).toBeTruthy();
    expect(screen.getByText('Insufficient balance')).toBeTruthy();
    await fireEvent.press(screen.getByText('Max'));
    await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));

    expect(page.onMax).not.toHaveBeenCalled();
    expect(page.onReview).not.toHaveBeenCalled();
  });

  it('shows the fee estimation progress', async () => {
    const page = props({ preparing: true });

    await renderPage(<SendAmountPage {...page} />);

    expect(screen.getByText('Estimating fee…')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('send-review'));
    expect(page.onReview).not.toHaveBeenCalled();
  });

  it('reviews the transfer with memo and total and reports confirm, fee and close', async () => {
    const transfer = review({ memo: 'Rent for November' });
    const page = props({ amount: '999999999999.123456', memo: 'Rent for November', review: transfer, reviewError: 'Out of gas' });

    await renderPage(<SendAmountPage {...page} />);

    expect(screen.getByText('12.5 GNOT')).toBeTruthy();
    expect(screen.getAllByText('Rent for November')).toHaveLength(2);
    expect(screen.getByText('12.5001 GNOT')).toBeTruthy();
    expect(screen.getByText('Out of gas')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Memo, Rent for November' })).toBeTruthy();
    await fireEvent.press(screen.getByText('Slow'));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm send' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(transfer.fee.onSelect).toHaveBeenCalledWith(FeeTier.SLOW);
    expect(page.onConfirm).toHaveBeenCalledTimes(1);
    expect(page.onCloseReview).toHaveBeenCalledTimes(1);
  });

  it('omits memo and total rows when absent and blocks closing while confirming', async () => {
    const page = props({ review: review({ totalLabel: undefined }), confirming: true });

    await renderPage(<SendAmountPage {...page} />);

    expect(screen.queryByText('Total')).toBeNull();
    expect(screen.getAllByText('Memo')).toHaveLength(1);
    expect(screen.getByText('Broadcasting…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('edits the memo in its sheet', async () => {
    const page = props({ memoSheetVisible: true, memo: 'hi' });

    await renderPage(<SendAmountPage {...page} />);

    await fireEvent.changeText(screen.getByLabelText('Memo (optional)'), 'hello');
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(page.onChangeMemo).toHaveBeenCalledWith('hello');
    expect(page.onCloseMemo).toHaveBeenCalledTimes(2);
  });

  it('lists tokens in the picker and reports the selection', async () => {
    const page = props({ tokenPickerVisible: true });

    await renderPage(<SendAmountPage {...page} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Gno.land, 1,000 GNOT' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Gnoswap, GNS' }));
    await fireEvent.press(within(screen.getByText('Select token').parent!.parent!).getByRole('button', { name: 'Close' }));

    expect(page.onSelectToken).toHaveBeenNthCalledWith(1, 'ugnot');
    expect(page.onSelectToken).toHaveBeenNthCalledWith(2, 'gns');
    expect(page.onCloseTokenPicker).toHaveBeenCalledTimes(1);
  });

  it('renders an empty token picker', async () => {
    await renderPage(<SendAmountPage {...props({ tokenPickerVisible: true, tokenOptions: [] })} />);

    expect(screen.getByText('Select token')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Gnoswap, GNS' })).toBeNull();
  });
});
