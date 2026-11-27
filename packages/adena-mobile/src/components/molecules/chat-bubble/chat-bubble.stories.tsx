import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { CHAT_DRAFT } from '../../../stories/fixtures';
import { ChatBubble } from './chat-bubble';

const meta = {
  title: 'Molecules/ChatBubble',
  component: ChatBubble,
  args: { message: { id: 'a', role: 'assistant', text: 'You hold 11,301.85 GNOT.' }, onReviewDraft: fn(), onDismissDraft: fn() },
} satisfies Meta<typeof ChatBubble>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Assistant: Story = {};

export const User: Story = { args: { message: { id: 'u', role: 'user', text: 'What is my GNOT balance?' } } };

export const Streaming: Story = { args: { message: { id: 's', role: 'assistant', text: 'Looking that up', streaming: true } } };

export const Typing: Story = { args: { message: { id: 's', role: 'assistant', text: '', streaming: true } } };

export const WithTools: Story = {
  args: {
    message: {
      id: 't',
      role: 'assistant',
      text: 'Checking your balances.',
      tools: [
        { id: '1', label: 'Get balance', status: 'done' },
        { id: '2', label: 'Look up activity', status: 'running' },
        { id: '3', label: 'Search token', status: 'error' },
      ],
    },
  },
};

export const WithWarningAndDraft: Story = {
  args: { message: { id: 'd', role: 'assistant', text: 'Prepared.', warnings: ['This address is new to you.'], drafts: [CHAT_DRAFT] } },
};

export const WithError: Story = { args: { message: { id: 'e', role: 'assistant', text: 'Partial answer', error: 'The request failed. Try again.' } } };
