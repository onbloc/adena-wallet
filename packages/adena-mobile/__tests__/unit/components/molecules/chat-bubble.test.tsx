import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ChatBubble } from '../../../../src/components/molecules';
import { ChatMessageView } from '../../../../src/components/view-models';

const message = (overrides: Partial<ChatMessageView> = {}): ChatMessageView => ({ id: 'm1', role: 'assistant', text: 'Hello', ...overrides });

describe('ChatBubble', () => {
  it('renders the message text', async () => {
    await render(<ChatBubble message={message({ role: 'user', text: 'Balance?' })} />);
    expect(screen.getByText('Balance?')).toBeTruthy();
  });

  it('renders tool chips with their status, warnings and the error', async () => {
    await render(
      <ChatBubble
        message={message({
          tools: [{ id: 't1', label: 'Get balance', status: 'done' }, { id: 't2', label: 'Look up activity', status: 'running' }],
          warnings: ['New recipient'],
          error: 'Request failed',
        })}
      />,
    );

    expect(screen.getByLabelText('Get balance, done')).toBeTruthy();
    expect(screen.getByLabelText('Look up activity, running')).toBeTruthy();
    expect(screen.getByText('New recipient')).toBeTruthy();
    expect(screen.getByText('Request failed')).toBeTruthy();
  });

  it('shows a typing indicator before any text streams in', async () => {
    await render(<ChatBubble message={message({ text: '', streaming: true })} />);
    expect(screen.getByTestId('chat-typing')).toBeTruthy();
  });

  it('routes draft actions with the draft id', async () => {
    const onReviewDraft = jest.fn();
    const onDismissDraft = jest.fn();
    const drafts = [{ id: 'd1', title: 'Send 1 GNOT', symbol: 'GNOT', rows: [], state: 'pending' as const }];

    await render(<ChatBubble message={message({ drafts })} onReviewDraft={onReviewDraft} onDismissDraft={onDismissDraft} />);
    await fireEvent.press(screen.getByTestId('chat-draft-review-d1'));
    await fireEvent.press(screen.getByTestId('chat-draft-dismiss-d1'));

    expect(onReviewDraft).toHaveBeenCalledWith('d1');
    expect(onDismissDraft).toHaveBeenCalledWith('d1');
  });
});
