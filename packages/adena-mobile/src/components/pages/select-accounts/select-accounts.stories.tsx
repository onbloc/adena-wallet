import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { SelectAccountsPage } from './select-accounts';

const ADDRESSES = [
  'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
  'g1us8428u2a5satrlxzagqqa5m6vmuze025anjlj',
  'g1manfred47kzduec920z88wfr64ylksmdcedlf5',
  'g1kcdd3n0d472g2p5l8svyg9t0wq6h5857nq992f',
  'g1lmxl9w4sh2q0r3hcd5ncsd5gqhdkspywzr4wce',
];

const meta = {
  title: 'Pages/Onboarding/SelectAccounts',
  component: SelectAccountsPage,
  parameters: { layout: 'fullscreen' },
  args: {
    accounts: ADDRESSES.map((address, hdIndex) => ({
      hdIndex,
      name: `Account ${hdIndex + 1}`,
      address,
      balance: hdIndex === 0 ? '1,024.5 GNOT' : hdIndex === 1 ? '12 GNOT' : hdIndex === 4 ? undefined : '0 GNOT',
      selected: hdIndex < 2,
    })),
    loading: false,
    loadingMore: false,
    onToggle: fn(),
    onLoadMore: fn(),
    onSubmit: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof SelectAccountsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = { args: { accounts: [], loading: true } };
