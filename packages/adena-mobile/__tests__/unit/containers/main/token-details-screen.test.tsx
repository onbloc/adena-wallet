import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TokenDetailsScreen } from '../../../../src/containers/main/token-details-screen';
import { Token, TokenType } from '../../../../src/domain/token';
import { useActivityList } from '../../../../src/hooks/use-activity-list';
import { useWalletAssets } from '../../../../src/hooks/use-wallet-assets';
import { useMarketDataQuery, useTokenInfoQuery } from '../../../../src/queries/market.queries';
import { useTokenBalancesQuery, useTokenPricesQuery } from '../../../../src/queries/token.queries';
import { useToastStore } from '../../../../src/stores/toast.store';
import { NETWORK } from '../../../helpers/query-wrapper';

jest.mock('../../../../src/hooks/use-wallet-assets', () => ({ useWalletAssets: jest.fn() }));
jest.mock('../../../../src/hooks/use-activity-list', () => ({ useActivityList: jest.fn() }));
jest.mock('../../../../src/queries/market.queries', () => ({ useMarketDataQuery: jest.fn(), useTokenInfoQuery: jest.fn() }));
jest.mock('../../../../src/queries/token.queries', () => ({ useTokenBalancesQuery: jest.fn(), useTokenPricesQuery: jest.fn() }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const GNOT: Token = { id: 'ugnot', networkId: NETWORK.id, family: NETWORK.family, type: TokenType.NATIVE, name: 'Gno.land', symbol: 'GNOT', decimals: 6, denom: 'ugnot', isNative: true };
const query = (data?: unknown) => ({ data, isPending: false, isError: false, refetch: jest.fn() });

const setup = async ({ tokens = [GNOT], tokensLoading = false } = {}) => {
  jest.mocked(useWalletAssets).mockReturnValue({ account: null, network: NETWORK, allTokens: tokens, tokensLoading } as unknown as ReturnType<typeof useWalletAssets>);
  jest.mocked(useActivityList).mockReturnValue({
    listProps: { sections: [], loading: false, supported: true, hasMore: false, loadingMore: false, onLoadMore: jest.fn(), onOpen: jest.fn() },
    refreshing: false,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useActivityList>);
  jest.mocked(useTokenBalancesQuery).mockReturnValue(query({}) as unknown as ReturnType<typeof useTokenBalancesQuery>);
  jest.mocked(useTokenPricesQuery).mockReturnValue(query({}) as unknown as ReturnType<typeof useTokenPricesQuery>);
  jest.mocked(useMarketDataQuery).mockReturnValue(query({ chart: [] }) as unknown as ReturnType<typeof useMarketDataQuery>);
  jest.mocked(useTokenInfoQuery).mockReturnValue(query({ stats: {}, links: [{ label: 'Website', url: 'https://good.example@evil.example/path' }] }) as unknown as ReturnType<typeof useTokenInfoQuery>);
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const Screen = TokenDetailsScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;
  const { ContainerProvider } = jest.requireActual('../../../../src/di/container-provider');

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ContainerProvider container={{ marketDataService: { isSupported: () => true } }}>
        <Screen navigation={navigation} route={{ key: 'TokenDetails', name: 'TokenDetails', params: { tokenId: 'ugnot' } }} />
      </ContainerProvider>
    </SafeAreaProvider>,
  );

  return { navigation };
};

describe('TokenDetailsScreen', () => {
  afterEach(() => jest.restoreAllMocks());

  it('keeps the top bar while the token list loads', async () => {
    const { navigation } = await setup({ tokens: [], tokensLoading: true });

    expect(screen.getByText('Token details')).toBeTruthy();
    expect(screen.getByLabelText('Loading token')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('explains a token missing from the network and offers a way back', async () => {
    const { navigation } = await setup({ tokens: [] });

    expect(screen.getByText('Token not found')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('shows the link host and reports a link that cannot be opened', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no browser'));
    useToastStore.setState({ toast: null });

    await setup();
    expect(screen.getByText('evil.example')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Website, evil.example' }));

    await waitFor(() => expect(useToastStore.getState().toast).toMatchObject({ message: 'Couldn’t open the link', tone: 'error' }));
  });
});
