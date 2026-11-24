import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { Button } from './button';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  args: { label: 'Continue', onPress: fn() },
  argTypes: {
    tone: { control: 'select', options: ['primary', 'secondary', 'tertiary', 'destructive', 'destructiveOutline', 'destructiveText'] },
    size: { control: 'select', options: ['default', 'compact'] },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = { args: { tone: 'secondary' } };

export const Destructive: Story = { args: { tone: 'destructive', label: 'Reset wallet' } };

export const DestructiveOutline: Story = { args: { tone: 'destructiveOutline', label: 'Disconnect', size: 'compact', fullWidth: false } };

export const DestructiveText: Story = { args: { tone: 'destructiveText', label: 'Remove account' } };

export const Loading: Story = { args: { loading: true, loadingLabel: 'Sending…' } };

export const Disabled: Story = { args: { disabled: true } };

export const WithIcon: Story = { args: { label: 'Copy address', leadingIcon: 'copy', size: 'compact' } };
