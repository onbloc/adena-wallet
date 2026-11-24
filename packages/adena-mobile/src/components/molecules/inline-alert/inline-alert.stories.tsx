import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { InlineAlert } from './inline-alert';

const meta = {
  title: 'Molecules/InlineAlert',
  component: InlineAlert,
  args: { title: 'cannot send transfer to self', tone: 'error' },
} satisfies Meta<typeof InlineAlert>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Error: Story = {};

export const Warning: Story = { args: { tone: 'warning', title: 'Gas budget is below the simulated usage', description: 'Raise the fee or the transaction may fail.' } };

export const Info: Story = { args: { tone: 'info', title: 'Requests are shown one at a time' } };
