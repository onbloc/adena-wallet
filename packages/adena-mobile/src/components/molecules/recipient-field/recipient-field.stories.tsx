import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { RecipientField } from './recipient-field';

const meta = {
  title: 'Molecules/RecipientField',
  component: RecipientField,
  args: { value: '', onChangeText: fn(), onScan: fn() },
} satisfies Meta<typeof RecipientField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = { args: { value: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5' } };

export const Partial: Story = { args: { value: 'g1jg8m' } };
