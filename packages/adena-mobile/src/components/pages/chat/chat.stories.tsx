import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { CHAT_MESSAGES, CHAT_REVIEW, CHAT_SETTINGS } from '../../../stories/fixtures';
import { Chat } from './chat';

const meta = {
  title: 'Pages/Chat',
  component: Chat,
  parameters: { layout: 'fullscreen' },
  args: {
    messages: CHAT_MESSAGES,
    setup: { kind: 'ready' },
    onOpenSettings: fn(),
    input: '',
    onChangeInput: fn(),
    sending: false,
    onSend: fn(),
    onStop: fn(),
    onNewChat: fn(),
    onBack: fn(),
    onReviewDraft: fn(),
    onDismissDraft: fn(),
    settings: { ...CHAT_SETTINGS, onSave: fn(), onClose: fn() },
    onSelectSuggestion: fn(),
  },
} satisfies Meta<typeof Chat>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Conversation: Story = {};

export const Empty: Story = { args: { messages: [], suggestions: ['What is my GNOT balance?', 'Show my recent activity'] } };

export const Streaming: Story = {
  args: {
    sending: true,
    input: '',
    messages: [CHAT_MESSAGES[0], { id: 's', role: 'assistant', text: 'Looking that up', streaming: true, tools: [{ id: 't', label: 'Get balance', status: 'running' }] }],
  },
};

export const NeedsKey: Story = { args: { messages: [], setup: { kind: 'needs-key' } } };

export const LocalModelDownloading: Story = { args: { messages: [], setup: { kind: 'local-model', state: 'downloading', percentage: 42 } } };

export const Reviewing: Story = { args: { review: { ...CHAT_REVIEW, onConfirm: fn(), onClose: fn() } } };

export const SettingsOpen: Story = { args: { settings: { ...CHAT_SETTINGS, visible: true, onSave: fn(), onClose: fn() } } };
