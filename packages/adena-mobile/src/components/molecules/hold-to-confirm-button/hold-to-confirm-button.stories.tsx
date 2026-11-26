import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { HoldToConfirmButton } from './hold-to-confirm-button';

const meta = {
  title: 'Molecules/HoldToConfirmButton',
  component: HoldToConfirmButton,
  args: { label: 'Hold to issue card', onConfirm: fn() },
} satisfies Meta<typeof HoldToConfirmButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Destructive: Story = { args: { tone: 'destructive', label: 'Hold to revoke' } };

export const Loading: Story = { args: { loading: true, loadingLabel: 'Broadcasting…' } };
