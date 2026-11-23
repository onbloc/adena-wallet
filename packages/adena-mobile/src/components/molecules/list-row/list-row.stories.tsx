import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { ListRow } from './list-row';

const meta = {
  title: 'Molecules/ListRow',
  component: ListRow,
  args: { label: 'Address book', onPress: fn() },
} satisfies Meta<typeof ListRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { leadingIcon: 'user', showChevron: true } };

export const WithValue: Story = { args: { label: 'Network', value: 'Gno.land Mainnet', showChevron: true } };

export const WithDescription: Story = { args: { label: 'Account 1', description: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5' } };

export const Destructive: Story = { args: { label: 'Reset wallet', destructive: true, leadingIcon: 'trash' } };
