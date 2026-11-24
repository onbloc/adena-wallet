import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { BuyCryptoPage } from './buy-crypto';

const gnot = { key: 'ugnot', symbol: 'GNOT', name: 'Gno.land', localIcon: 'gnot' as const, balanceLabel: 'Balance: 11,301.850689 GNOT' };

const meta = {
  title: 'Pages/BuyCrypto',
  component: BuyCryptoPage,
  parameters: { layout: 'fullscreen' },
  args: {
    amountLabel: '150',
    currency: 'USD',
    estimateLabel: 'Estimated 357.142857 GNOT before fees',
    token: gnot,
    tokenOptions: [gnot, { key: 'gno.land/r/gnoswap/gns.GNS', symbol: 'GNS', name: 'Gnoswap', balanceLabel: 'Balance: 49,985 GNS' }],
    tokenPickerVisible: false,
    onOpenTokenPicker: fn(),
    onCloseTokenPicker: fn(),
    onSelectToken: fn(),
    canContinue: true,
    onKeyPress: fn(),
    onContinue: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof BuyCryptoPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Entry: Story = {};

export const Empty: Story = { args: { amountLabel: '', estimateLabel: undefined, canContinue: false } };

export const Unavailable: Story = {
  args: {
    tokenOptions: [],
    estimateLabel: undefined,
    canContinue: false,
    unavailable: { title: 'Buying GNOT isn\'t available yet', description: 'No payment provider supports this token yet. Check back later.' },
  },
};

export const TokenPicker: Story = { args: { tokenPickerVisible: true } };
