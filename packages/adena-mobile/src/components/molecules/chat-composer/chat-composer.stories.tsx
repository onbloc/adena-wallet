import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { ChatComposer } from './chat-composer';

const meta = {
  title: 'Molecules/ChatComposer',
  component: ChatComposer,
  args: { value: 'What is my GNOT balance?', onChangeText: fn(), sending: false, onSend: fn(), onStop: fn() },
} satisfies Meta<typeof ChatComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { value: '' } };

export const Sending: Story = { args: { sending: true } };

export const Disabled: Story = { args: { value: '', disabled: true, placeholder: 'Set up the assistant to chat' } };
