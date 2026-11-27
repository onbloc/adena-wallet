import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { CHAT_DRAFT } from '../../../stories/fixtures';
import { ChatDraftCard } from './chat-draft-card';

const meta = {
  title: 'Molecules/ChatDraftCard',
  component: ChatDraftCard,
  args: { draft: CHAT_DRAFT, onReview: fn(), onDismiss: fn(), onViewActivity: fn() },
} satisfies Meta<typeof ChatDraftCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Pending: Story = {};

export const Sent: Story = { args: { draft: { ...CHAT_DRAFT, state: 'sent' } } };

export const Dismissed: Story = { args: { draft: { ...CHAT_DRAFT, state: 'dismissed' } } };

export const Submitted: Story = { args: { draft: { ...CHAT_DRAFT, state: 'submitted', message: 'Submitted. Confirmation is pending.' } } };

export const Unconfirmed: Story = { args: { draft: { ...CHAT_DRAFT, state: 'unconfirmed', message: 'Outcome not confirmed. Check Activity before sending again.' } } };
