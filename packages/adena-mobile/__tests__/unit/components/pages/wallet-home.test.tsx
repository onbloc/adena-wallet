import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { WalletHomePage, WalletHomePageProps } from '../../../../src/components/pages';
import { Trend } from '../../../../src/components/view-models';
import { renderPage } from './render-page';

type Node = { parent: Node | null; props: { refreshControl?: { props: { onRefresh: () => void } } } };

const refreshControlOf = (start: Node): { onRefresh: () => void } => {
  let node: Node | null = start;

  while (node && !node.props.refreshControl) {
    node = node.parent;
  }

  return node!.props.refreshControl!.props;
};

const address = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const props = (overrides: Partial<WalletHomePageProps> = {}): WalletHomePageProps => ({
  accountName: 'Adena wallet',
  address,
  networkName: 'Mainnet',
  isTestnet: false,
  headline: '$1,234.50',
  headlineCaption: '+$12.00 (+0.98%) today',
  headlineLoading: false,
  assets: [
    { key: 'ugnot', symbol: 'GNOT', name: 'Gno.land', quantity: '1,234.5 GNOT', value: '$1,234.50', change: '+1.2%', trend: Trend.POSITIVE, loading: false },
    { key: 'gns', symbol: 'GNS', name: 'Gnoswap', quantity: '0 GNS', value: '$0.00', trend: Trend.NEUTRAL, loading: false },
  ],
  collections: [
    { key: 'col-1', title: 'Gnopher', subtitle: '3 items', imageUri: 'https://example.com/a.png', imageLoading: false },
    { key: 'col-2', title: 'Untitled', imageUri: null, imageLoading: true },
  ],
  nftSupported: true,
  nftLoading: false,
  tab: 'tokens',
  refreshing: false,
  onRefresh: jest.fn(),
  onTabChange: jest.fn(),
  onCopyAddress: jest.fn(),
  onOpenAccounts: jest.fn(),
  onOpenSettings: jest.fn(),
  onScan: jest.fn(),
  onOpenToken: jest.fn(),
  onOpenCollection: jest.fn(),
  onManageTokens: jest.fn(),
  onManageNfts: jest.fn(),
  onBuy: jest.fn(),
  onSend: jest.fn(),
  onReceive: jest.fn(),
  ...overrides,
});

describe('WalletHomePage', () => {
  it('renders the tokens tab and reports every header and token action', async () => {
    const page = props();

    await renderPage(<WalletHomePage {...page} />);

    expect(screen.queryByText('Mainnet')).toBeNull();
    expect(screen.getByText('+1.2%')).toBeTruthy();
    expect(screen.getByText('g1jg...sqf5')).toBeTruthy();
    expect(screen.queryByText('Unable to load balances')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Switch account' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Scan QR code' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Copy address' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Buy' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Receive' }));
    await fireEvent.press(screen.getByText('Gno.land'));
    await fireEvent.press(screen.getByText('Gnoswap'));
    await fireEvent.press(screen.getByRole('button', { name: 'Manage tokens' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'NFTs' }));
    await act(() => refreshControlOf(screen.getByText('+1.2%')).onRefresh());

    expect(page.onOpenAccounts).toHaveBeenCalledTimes(1);
    expect(page.onScan).toHaveBeenCalledTimes(1);
    expect(page.onOpenSettings).toHaveBeenCalledTimes(1);
    expect(page.onCopyAddress).toHaveBeenCalledTimes(1);
    expect(page.onBuy).toHaveBeenCalledTimes(1);
    expect(page.onSend).toHaveBeenCalledTimes(1);
    expect(page.onReceive).toHaveBeenCalledTimes(1);
    expect(page.onOpenToken).toHaveBeenNthCalledWith(1, 'ugnot');
    expect(page.onOpenToken).toHaveBeenNthCalledWith(2, 'gns');
    expect(page.onManageTokens).toHaveBeenCalledTimes(1);
    expect(page.onTabChange).toHaveBeenCalledWith('nfts');
    expect(page.onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Manage NFTs' })).toBeNull();
  });

  it('shows Buy disabled when no buy action is wired', async () => {
    await renderPage(<WalletHomePage {...props({ onBuy: undefined })} />);

    const buy = screen.getByRole('button', { name: 'Buy' });

    expect(buy.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    await fireEvent.press(buy);
    expect(screen.getByRole('button', { name: 'Send' }).props.accessibilityState).toEqual(expect.objectContaining({ disabled: false }));
  });

  it('shows the balance error, testnet badge and loading skeletons', async () => {
    await renderPage(
      <WalletHomePage {...props({
        isTestnet: true,
        networkName: 'Testnet 13',
        headline: undefined,
        headlineCaption: undefined,
        headlineLoading: true,
        error: 'Network unreachable',
        assets: [{ key: 'ugnot', symbol: 'GNOT', name: 'Gno.land', trend: Trend.NEUTRAL, loading: true }],
      })}
      />,
    );

    expect(screen.getByText('Testnet 13')).toBeTruthy();
    expect(screen.getByText('Unable to load balances')).toBeTruthy();
    expect(screen.getByText('Network unreachable')).toBeTruthy();
  });

  it('renders an empty token list with only the manage action', async () => {
    await renderPage(<WalletHomePage {...props({ assets: [], accountName: 'A very long account name that should be truncated on screen' })} />);

    expect(screen.getByText('A very long account name that should be truncated on screen')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Manage tokens' })).toBeTruthy();
  });

  it('lists collections on the NFTs tab and opens them', async () => {
    const page = props({ tab: 'nfts', nftSummary: '4 collectibles · 2 collections' });

    await renderPage(<WalletHomePage {...page} />);

    expect(screen.queryByRole('button', { name: 'Manage tokens' })).toBeNull();
    expect(screen.getByText('4 collectibles · 2 collections')).toBeTruthy();
    expect(screen.getByText('3 items')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Gnopher' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Untitled' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Manage NFTs' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Tokens' }));

    expect(page.onOpenCollection).toHaveBeenNthCalledWith(1, 'col-1');
    expect(page.onOpenCollection).toHaveBeenNthCalledWith(2, 'col-2');
    expect(page.onManageNfts).toHaveBeenCalledTimes(1);
    expect(page.onTabChange).toHaveBeenCalledWith('tokens');
  });

  it('shows loading and empty collectible states', async () => {
    const { rerender } = await renderPage(<WalletHomePage {...props({ tab: 'nfts', nftLoading: true })} />);

    expect(screen.getByText('Loading collectibles…')).toBeTruthy();

    await rerender(<WalletHomePage {...props({ tab: 'nfts', collections: [] })} />);
    expect(screen.getByText('No collectibles yet')).toBeTruthy();
    expect(screen.queryByText(/collectibles ·/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Manage NFTs' })).toBeTruthy();
  });

  it('shows a retryable error instead of the empty state when collectibles fail to load', async () => {
    const onRetryNfts = jest.fn();

    await renderPage(<WalletHomePage {...props({ tab: 'nfts', collections: [], nftError: 'Indexer down', onRetryNfts })} />);

    expect(screen.getByText('Couldn’t load collectibles')).toBeTruthy();
    expect(screen.getByText('Indexer down')).toBeTruthy();
    expect(screen.queryByText('No collectibles yet')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetryNfts).toHaveBeenCalledTimes(1);
  });

  it('explains unsupported NFTs and hides the manage action', async () => {
    await renderPage(<WalletHomePage {...props({ tab: 'nfts', nftSupported: false })} />);

    expect(screen.getByText('NFTs are not available')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Manage NFTs' })).toBeNull();
  });
});
