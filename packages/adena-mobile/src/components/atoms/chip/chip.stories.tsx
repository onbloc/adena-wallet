import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { Chip } from './chip';

const meta = {
  title: 'Atoms/Chip',
  component: Chip,
  args: { label: 'GNOT', onPress: fn() },
} satisfies Meta<typeof Chip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { selected: true } };

export const WithTrailingIcon: Story = { args: { trailingIcon: 'chevronDown' } };

export const Disabled: Story = { args: { disabled: true } };
