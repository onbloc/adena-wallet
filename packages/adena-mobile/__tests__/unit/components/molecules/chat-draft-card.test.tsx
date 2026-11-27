import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ChatDraftCard } from '../../../../src/components/molecules';
import { ChatDraftView } from '../../../../src/components/view-models';

const draft: ChatDraftView = {
  id: 'd1',
  title: 'Send 1 GNOT',
  rows: [{ label: 'To', value: 'g1abc', multiline: true }, { label: 'Amount', value: '1 GNOT' }],
  state: 'pending',
};

describe('ChatDraftCard', () => {
  it('offers Review and Dismiss while pending', async () => {
    const onReview = jest.fn();
    const onDismiss = jest.fn();

    await render(<ChatDraftCard draft={draft} onReview={onReview} onDismiss={onDismiss} />);
    expect(screen.getByText('Send 1 GNOT')).toBeTruthy();
    expect(screen.getByText('g1abc')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chat-draft-review-d1'));
    await fireEvent.press(screen.getByTestId('chat-draft-dismiss-d1'));

    expect(onReview).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows a Sent badge without actions', async () => {
    await render(<ChatDraftCard draft={{ ...draft, state: 'sent' }} onReview={jest.fn()} onDismiss={jest.fn()} />);
    expect(screen.getByText('Sent')).toBeTruthy();
    expect(screen.queryByTestId('chat-draft-review-d1')).toBeNull();
  });

  it('shows Dismissed without actions', async () => {
    await render(<ChatDraftCard draft={{ ...draft, state: 'dismissed' }} onReview={jest.fn()} onDismiss={jest.fn()} />);
    expect(screen.getByText('Dismissed')).toBeTruthy();
    expect(screen.queryByTestId('chat-draft-dismiss-d1')).toBeNull();
  });
});
