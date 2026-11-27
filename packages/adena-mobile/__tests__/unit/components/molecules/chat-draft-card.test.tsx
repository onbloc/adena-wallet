import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ChatDraftCard } from '../../../../src/components/molecules';
import { ChatDraftView } from '../../../../src/components/view-models';

const draft: ChatDraftView = {
  id: 'd1',
  title: 'Send 1 GNOT',
  symbol: 'GNOT',
  fiatLabel: '≈ $0.11',
  rows: [{ label: 'To', value: 'g1abc', multiline: true }, { label: 'Network', value: 'Gno.land Mainnet' }],
  state: 'pending',
};

const renderCard = (overrides: Partial<ChatDraftView> = {}, onViewActivity = jest.fn()) => render(
  <ChatDraftCard draft={{ ...draft, ...overrides }} onReview={jest.fn()} onDismiss={jest.fn()} onViewActivity={onViewActivity} />,
);

describe('ChatDraftCard', () => {
  it('offers Review and Dismiss while pending', async () => {
    const onReview = jest.fn();
    const onDismiss = jest.fn();

    await render(<ChatDraftCard draft={draft} onReview={onReview} onDismiss={onDismiss} onViewActivity={jest.fn()} />);
    expect(screen.getByText('Send 1 GNOT')).toBeTruthy();
    expect(screen.getByText('≈ $0.11')).toBeTruthy();
    expect(screen.getByText('g1abc')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chat-draft-review-d1'));
    await fireEvent.press(screen.getByTestId('chat-draft-dismiss-d1'));

    expect(onReview).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows a Sent badge without actions or an activity link', async () => {
    await renderCard({ state: 'sent' });
    expect(screen.getByText('Sent')).toBeTruthy();
    expect(screen.queryByTestId('chat-draft-review-d1')).toBeNull();
    expect(screen.queryByTestId('chat-draft-activity-d1')).toBeNull();
  });

  it.each([
    ['submitted', 'Pending', 'Submitted. Confirmation is pending.'],
    ['unconfirmed', 'Check Activity', 'Outcome not confirmed. Check Activity before sending again.'],
  ] as const)('shows %s as "%s" with its message and a way to Activity', async (state, badge, message) => {
    const onViewActivity = jest.fn();

    await renderCard({ state, message }, onViewActivity);
    expect(screen.getByText(badge)).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByText('Dismissed')).toBeNull();
    expect(screen.queryByTestId('chat-draft-review-d1')).toBeNull();
    await fireEvent.press(screen.getByTestId('chat-draft-activity-d1'));

    expect(onViewActivity).toHaveBeenCalledTimes(1);
  });

  it('shows Dismissed without actions', async () => {
    await renderCard({ state: 'dismissed' });
    expect(screen.getByText('Dismissed')).toBeTruthy();
    expect(screen.queryByTestId('chat-draft-dismiss-d1')).toBeNull();
  });
});
