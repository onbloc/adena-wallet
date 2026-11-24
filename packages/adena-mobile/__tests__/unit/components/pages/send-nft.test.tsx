import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { SendNftPage, SendNftPageProps } from '../../../../src/components/pages';
import { FeeTier } from '../../../../src/domain/fee';
import { renderPage } from './render-page';

const recipient = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const suggestion = 'g1us8428u2a5satrlxzagqqa5m6vmuze025anjlj';

const props = (overrides: Partial<SendNftPageProps> = {}): SendNftPageProps => ({
  title: 'Gnopher #42',
  collectionName: 'Gnophers',
  imageUri: 'https://example.com/42.png',
  recipient: 'g1us',
  onChangeRecipient: jest.fn(),
  onScanRecipient: jest.fn(),
  suggestions: [{ key: 'book-1', label: 'Alice', address: suggestion }],
  onSelectSuggestion: jest.fn(),
  canReview: true,
  preparing: false,
  onReview: jest.fn(),
  review: {
    visible: false,
    rows: [{ label: 'To', value: recipient, multiline: true }],
    fee: {
      options: [{ tier: FeeTier.AVERAGE, label: 'Average', feeLabel: '0.0001 GNOT' }],
      selected: FeeTier.AVERAGE,
      onSelect: jest.fn(),
      customAdjustment: '',
      onChangeCustomAdjustment: jest.fn(),
      tooLow: false,
    },
    confirming: false,
    onConfirm: jest.fn(),
    onClose: jest.fn(),
  },
  onBack: jest.fn(),
  ...overrides,
});

describe('SendNftPage', () => {
  it('renders the NFT and reports recipient edits, suggestion, review and back', async () => {
    const page = props();

    await renderPage(<SendNftPage {...page} />);

    expect(screen.getByText('Gnopher #42')).toBeTruthy();
    expect(screen.getByText('Gnophers')).toBeTruthy();
    expect(screen.getByText('Suggestions')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Recipient address'), recipient);
    await fireEvent.press(screen.getByRole('button', { name: 'Alice, g1us84...5anjlj' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Scan QR code' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onChangeRecipient).toHaveBeenCalledWith(recipient);
    expect(page.onSelectSuggestion).toHaveBeenCalledWith(suggestion);
    expect(page.onScanRecipient).toHaveBeenCalledTimes(1);
    expect(page.onReview).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Review NFT transfer')).toBeNull();
  });

  it('shows validation and prepare errors without suggestions and blocks review', async () => {
    const page = props({ imageUri: null, recipient: '', recipientError: 'Invalid address', prepareError: 'Simulation failed', suggestions: [], canReview: false });

    await renderPage(<SendNftPage {...page} />);

    expect(screen.getByText('Invalid address')).toBeTruthy();
    expect(screen.getByText('Unable to prepare the transfer')).toBeTruthy();
    expect(screen.getByText('Simulation failed')).toBeTruthy();
    expect(screen.queryByText('Suggestions')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Review transfer' }));
    expect(page.onReview).not.toHaveBeenCalled();
  });

  it('shows the estimation progress', async () => {
    await renderPage(<SendNftPage {...props({ preparing: true })} />);

    expect(screen.getByText('Estimating fee…')).toBeTruthy();
  });

  it('opens the review sheet and reports confirm and close', async () => {
    const base = props();
    const page = props({ review: { ...base.review, visible: true, error: 'Rejected' } });

    await renderPage(<SendNftPage {...page} />);

    expect(screen.getByText('Review NFT transfer')).toBeTruthy();
    expect(screen.getAllByText('Gnopher #42')).toHaveLength(2);
    expect(screen.getByText(recipient)).toBeTruthy();
    expect(screen.getByText('Rejected')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm send' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(page.review.onConfirm).toHaveBeenCalledTimes(1);
    expect(page.review.onClose).toHaveBeenCalledTimes(1);
  });
});
