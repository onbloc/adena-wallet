import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { SAMPLE_ADDRESS, SAMPLE_ASSETS, SAMPLE_AVATAR_PHOTO, SAMPLE_COLLECTIONS } from '../../../stories/fixtures';
import { WalletHomePage } from './wallet-home';

const meta = {
  title: 'Pages/WalletHome',
  component: WalletHomePage,
  parameters: { layout: 'fullscreen' },
  args: {
    accountName: 'Account 1',
    address: SAMPLE_ADDRESS,
    networkName: 'Gno.land Mainnet',
    isTestnet: false,
    headline: '$2,055.24',
    headlineCaption: '+$41.20 (2.04%) today',
    headlineCaptionColor: 'success',
    headlineLoading: false,
    assets: SAMPLE_ASSETS,
    collections: SAMPLE_COLLECTIONS,
    nftSummary: '4 collectibles · 2 collections',
    nftSupported: true,
    nftLoading: false,
    tab: 'tokens',
    refreshing: false,
    onRefresh: fn(),
    onTabChange: fn(),
    onCopyAddress: fn(),
    onOpenAccounts: fn(),
    onOpenSettings: fn(),
    onScan: fn(),
    onOpenToken: fn(),
    onOpenCollection: fn(),
    onManageTokens: fn(),
    onBuy: fn(),
    onSend: fn(),
    onReceive: fn(),
    onManageNfts: fn(),
  },
} satisfies Meta<typeof WalletHomePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Tokens: Story = {};

export const Nfts: Story = { args: { tab: 'nfts' } };

export const Testnet: Story = { args: { networkName: 'Onyx Testnet', isTestnet: true, headline: '11,301.850689 GNOT', headlineCaption: undefined } };

export const Loading: Story = { args: { headlineLoading: true, assetsLoading: true, assetPlaceholderCount: SAMPLE_ASSETS.length } };

export const PricesLoading: Story = { args: { headlineLoading: true, assets: SAMPLE_ASSETS.map(asset => ({ ...asset, valueLoading: true })) } };

export const Empty: Story = { args: { headline: '$0.00', headlineCaption: undefined, assets: [], collections: [] } };

export const Error: Story = { args: { error: 'Network request failed' } };

// Production state until an on-ramp provider is available.
export const BuyUnavailable: Story = { args: { onBuy: undefined } };

export const ProfilePhoto: Story = { args: { accountAvatarPhoto: SAMPLE_AVATAR_PHOTO } };
