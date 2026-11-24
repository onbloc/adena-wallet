import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { CheckoutPage } from './checkout';

const meta = {
  title: 'Pages/Checkout',
  component: CheckoutPage,
  parameters: { layout: 'fullscreen' },
  args: {
    amountLabel: '$150.00',
    tokenName: 'Gno.land',
    providers: [
      { id: 'provider-a', name: 'Provider A', paymentMethods: 'Debit card · Apple Pay' },
      { id: 'provider-b', name: 'Provider B', paymentMethods: 'Debit card' },
    ],
    onSelectProvider: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof CheckoutPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Providers: Story = {};

export const NoProviders: Story = { args: { providers: [] } };
