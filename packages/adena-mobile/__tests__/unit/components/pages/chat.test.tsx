import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { Chat, ChatProps } from '../../../../src/components/pages';
import { CHAT_MESSAGES, CHAT_REVIEW, CHAT_SETTINGS } from '../../../../src/stories/fixtures';
import { renderPage, wrapPage } from './render-page';

const props = (overrides: Partial<ChatProps> = {}): ChatProps => ({
  messages: CHAT_MESSAGES,
  setup: { kind: 'ready' },
  onOpenSettings: jest.fn(),
  input: 'hi',
  onChangeInput: jest.fn(),
  sending: false,
  onSend: jest.fn(),
  onStop: jest.fn(),
  onNewChat: jest.fn(),
  onBack: jest.fn(),
  onReviewDraft: jest.fn(),
  onDismissDraft: jest.fn(),
  onOpenActivity: jest.fn(),
  settings: CHAT_SETTINGS,
  ...overrides,
});

describe('Chat', () => {
  it('renders the transcript and routes composer and draft actions', async () => {
    const page = props();

    await renderPage(<Chat {...page} />);
    expect(screen.getByText('What is my GNOT balance?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chat-send'));
    await fireEvent.press(screen.getByTestId('chat-draft-review-draft-1'));
    await fireEvent.press(screen.getByTestId('chat-draft-dismiss-draft-1'));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    await fireEvent.press(screen.getByRole('button', { name: 'New chat' }));
    await fireEvent.press(screen.getByRole('button', { name: 'AI settings' }));

    expect(page.onSend).toHaveBeenCalledTimes(1);
    expect(page.onReviewDraft).toHaveBeenCalledWith('draft-1');
    expect(page.onDismissDraft).toHaveBeenCalledWith('draft-1');
    expect(page.onBack).toHaveBeenCalledTimes(1);
    expect(page.onNewChat).toHaveBeenCalledTimes(1);
    expect(page.onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state with suggestions that fill the composer', async () => {
    const page = props({ messages: [], suggestions: ['What is my GNOT balance?'], onSelectSuggestion: jest.fn() });

    await renderPage(<Chat {...page} />);
    expect(screen.getByTestId('chat-empty')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'What is my GNOT balance?' }));

    expect(page.onSelectSuggestion).toHaveBeenCalledWith('What is my GNOT balance?');
    expect(screen.getByRole('button', { name: 'New chat' }).props.accessibilityState.disabled).toBe(true);
  });

  it('disables new chat while a reply is streaming', async () => {
    await renderPage(<Chat {...props({ sending: true })} />);
    expect(screen.getByRole('button', { name: 'New chat' }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('chat-stop')).toBeTruthy();
  });

  it('shows the key banner and disables the composer', async () => {
    const page = props({ setup: { kind: 'needs-key' } });

    await renderPage(<Chat {...page} />);
    expect(screen.getByText('Add an OpenAI API key to start chatting.')).toBeTruthy();
    expect(screen.getByTestId('chat-input').props.editable).toBe(false);
    await fireEvent.press(screen.getByTestId('chat-setup-action'));

    expect(page.onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('shows local model progress and unlocks once ready', async () => {
    const { rerender } = await renderPage(<Chat {...props({ setup: { kind: 'local-model', state: 'downloading', percentage: 42 } })} />);

    expect(screen.getByText('Downloading the on-device model…')).toBeTruthy();
    expect(screen.getByText('42%')).toBeTruthy();
    expect(screen.getByTestId('chat-input').props.editable).toBe(false);

    await rerender(wrapPage(<Chat {...props({ setup: { kind: 'local-model', state: 'ready' } })} />));
    expect(screen.queryByTestId('chat-setup-banner')).toBeNull();
    expect(screen.getByTestId('chat-input').props.editable).toBe(true);
  });

  it('shows the review sheet only when a review is given', async () => {
    const page = props({ review: { ...CHAT_REVIEW, onConfirm: jest.fn() } });
    const { rerender } = await renderPage(<Chat {...props()} />);

    expect(screen.queryByTestId('review-confirm')).toBeNull();
    await rerender(wrapPage(<Chat {...page} />));
    await fireEvent.press(screen.getByTestId('review-confirm'));

    expect(screen.getByText('Review transfer')).toBeTruthy();
    expect(page.review?.onConfirm).toHaveBeenCalledTimes(1);
  });
});
