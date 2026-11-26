import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { CardChatPage } from './card-chat';

const meta = {
  title: 'Pages/CardChat',
  component: CardChatPage,
  parameters: { layout: 'fullscreen' },
  args: {
    stage: 0,
    messages: [
      { id: 'q1', from: 'bot', text: 'What it does' },
      { id: 'a1', from: 'user', text: 'Send GNOT' },
    ],
    question: 'How much can it spend, fees included?',
    options: [{ key: '1', label: '1 GNOT' }, { key: '5', label: '5 GNOT' }, { key: '10', label: '10 GNOT' }],
    onSelect: fn(),
    onBack: fn(),
    onRestart: fn(),
    canRestart: true,
    preparing: false,
    review: { confirming: false, onConfirm: fn(), onClose: fn() },
  },
} satisfies Meta<typeof CardChatPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Question: Story = {};

export const Templates: Story = {
  args: {
    messages: [],
    canRestart: false,
    question: 'What should this card do?',
    options: [
      { key: 'send', label: 'Send GNOT', description: 'Send GNOT to any address, up to its limit', icon: 'arrowUp' },
      { key: 'trade', label: 'Trade on GnoSwap', description: 'Swap through the GnoSwap router', icon: 'swap' },
    ],
  },
};

export const AddressInput: Story = {
  args: {
    question: 'Who should receive it?',
    options: [],
    input: { label: 'Address', placeholder: 'g1…', value: '', onChange: fn(), onSubmit: fn() },
  },
};

export const Checking: Story = { args: { stage: 1, question: 'Issue this card?', options: [], preparing: true } };
