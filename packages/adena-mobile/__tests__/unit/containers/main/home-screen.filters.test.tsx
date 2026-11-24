import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from '../../../../src/containers/main/home-screen';
import { ChainFamily } from '../../../../src/domain/network';
import { ManagedToken, TokenSource, TokenType } from '../../../../src/domain/token';
import { toAssetView } from '../../../../src/presenters/asset.presenter';
import { StoragePreferenceRepository } from '../../../../src/repositories/preference.repository';
import { PreferenceService } from '../../../../src/services/preference.service';
import { MemoryKeyValueStore } from '../../../../src/storage/memory-key-value-store';
import { ACCOUNT, createWrapper, NETWORK } from '../../../helpers/query-wrapper';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const managed = (id: string, name: string, source: TokenSource, extra: Partial<ManagedToken> = {}): ManagedToken => ({
  id,
  name,
  symbol: id.toUpperCase(),
  networkId: NETWORK.id,
  family: ChainFamily.GNO,
  type: TokenType.GRC20,
  decimals: 0,
  isNative: false,
  visible: true,
  source,
  ...extra,
});
const price = (tokenId: string, usd: number) => ({ tokenId, networkId: NETWORK.id, usd, change24h: null });

const native = managed('ugnot', 'Gno.land', TokenSource.DEFAULT, { type: TokenType.NATIVE, isNative: true });
const dust = managed('dust', 'Dust Token', TokenSource.DISCOVERED, { listed: true });
const spam = managed('spam', 'Spam Token', TokenSource.DISCOVERED);
const mine = managed('mine', 'My Token', TokenSource.CUSTOM);
const tokens = [native, dust, spam, mine];

jest.mock('../../../../src/hooks/use-wallet-assets', () => ({ useWalletAssets: () => mockWallet }));
jest.mock('../../../../src/hooks/use-nft-images', () => ({ useNftImages: () => ({}) }));
jest.mock('../../../../src/queries/nft.queries', () => ({
  useNftCollectionsQuery: () => ({ data: [], isPending: false, fetchStatus: 'idle', error: null, refetch: jest.fn() }),
  refetchUnresolvedNftUris: jest.fn(),
}));

const mockWallet = {
  account: ACCOUNT,
  network: NETWORK,
  tokens,
  allTokens: tokens,
  assets: [
    toAssetView(native, '0', price('ugnot', 0.1), false),
    toAssetView(dust, '1', price('dust', 0.5), false),
    toAssetView(spam, '100', price('spam', 1), false),
    toAssetView(mine, '1', price('mine', 0.01), false),
  ],
  portfolio: null,
  error: null,
  status: 'ready',
  pricesLoading: false,
  loading: false,
  tokensLoading: false,
  refreshing: false,
  refetch: jest.fn(),
};

describe('HomeScreen balance filters', () => {
  it('hides small and unknown tokens by default and follows preference changes live', async () => {
    const preferenceService = new PreferenceService(new StoragePreferenceRepository(new MemoryKeyValueStore()));
    const { Wrapper } = createWrapper({
      accountService: { getCurrentAccount: () => ACCOUNT, getAccounts: () => [ACCOUNT], getAddress: () => 'g1addr' },
      networkService: { getCurrentNetwork: () => NETWORK, getNetworks: () => [NETWORK] },
      nftService: { getPreferences: () => ({}) },
      preferenceService,
    });
    const Screen = HomeScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Wrapper><Screen navigation={{ navigate: jest.fn() }} route={{ key: 'Wallet', name: 'Wallet' }} /></Wrapper>
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Gno.land')).toBeTruthy();
    expect(screen.getByText('My Token')).toBeTruthy();
    expect(screen.queryByText('Dust Token')).toBeNull();
    expect(screen.queryByText('Spam Token')).toBeNull();

    await act(() => {
      preferenceService.update({ hideUnknownTokens: false });
    });
    expect(screen.getByText('Spam Token')).toBeTruthy();
    expect(screen.queryByText('Dust Token')).toBeNull();

    await act(() => {
      preferenceService.update({ hideSmallBalances: false });
    });
    expect(screen.getByText('Dust Token')).toBeTruthy();
  });
});
