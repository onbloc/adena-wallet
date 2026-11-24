import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { TextField } from './text-field';

const meta = {
  title: 'Molecules/TextField',
  component: TextField,
  args: { label: 'Password', placeholder: 'Enter your password', onChangeText: fn() },
} satisfies Meta<typeof TextField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = { args: { value: 'correct horse battery' } };

export const Secure: Story = { args: { value: 'correct horse battery', secure: true } };

export const WithHelper: Story = { args: { helper: 'At least 8 characters.' } };

export const WithError: Story = { args: { value: 'short', error: 'Use at least 8 characters.' } };

export const Disabled: Story = { args: { value: 'g1jg...sqf5', disabled: true } };
