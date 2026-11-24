import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { SAMPLE_ADDRESS, SAMPLE_RECIPIENT } from '../../../stories/fixtures';
import { SearchPage } from './search';

const meta = {
  title: 'Pages/Search',
  component: SearchPage,
  parameters: { layout: 'fullscreen' },
  args: {
    query: 'gn',
    onChangeQuery: fn(),
    scopeLabel: 'All networks',
    onToggleScope: fn(),
    searching: true,
    tokens: [
      { key: 'ugnot', name: 'Gno.land', symbol: 'GNOT', localIcon: 'gnot', caption: 'GNOT' },
      { key: 'gno.land/r/gnoswap/gns.GNS', name: 'Gnoswap', symbol: 'GNS', caption: 'GNS' },
    ],
    wallets: [
      { key: 'account:1', name: 'Gnome Wallet', address: SAMPLE_ADDRESS, avatarColor: '#0E7490' },
      { key: 'contact:1', name: 'Gnomad', address: SAMPLE_RECIPIENT },
    ],
    collections: [{ key: 'gno.land/r/demo/nft', name: 'Gnome Punks', caption: 'Gno.land Mainnet · NFT collection', imageUri: null, imageLoading: false }],
    onOpenToken: fn(),
    onOpenWallet: fn(),
    onOpenCollection: fn(),
    onConfirmNetworkSwitch: fn(),
    onCancelNetworkSwitch: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof SearchPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Results: Story = {};

export const Idle: Story = { args: { query: '', searching: false, tokens: [], wallets: [], collections: [] } };

export const NoResults: Story = { args: { query: 'zzz', scopeLabel: 'Gno.land Mainnet', tokens: [], wallets: [], collections: [] } };

export const SwitchNetwork: Story = {
  args: { networkSwitch: { title: 'Switch to Gno.land Testnet?', description: 'GNOT is on Gno.land Testnet. Your wallet will switch networks to open it.' } },
};
