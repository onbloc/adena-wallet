import { act, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from '../../../../src/containers/main/home-screen/home-screen';
import { ManagedToken, TokenSource, TokenType } from '../../../../src/domain/token';
import { PRICE_GRACE_MS } from '../../../../src/hooks/use-wallet-assets';
import { TokenPriceMap } from '../../../../src/services/price.service';
import { createWrapper, NETWORK } from '../../../helpers/query-wrapper';

jest.mock('../../../../src/hooks/use-wallet-snapshot', () => {
  const { ACCOUNT: account, NETWORK: network } = jest.requireActual('../../../helpers/query-wrapper');

  return { useWalletSnapshot: () => ({ account, network, address: 'g1address', accounts: [account], networks: [network], revision: 0 }) };
});
jest.mock('../../../../src/hooks/use-nft-images', () => ({ useNftImages: () => ({}) }));
jest.mock('../../../../src/queries/nft.queries', () => ({
  useNftCollectionsQuery: () => ({ data: [], error: null, isPending: false, fetchStatus: 'idle', refetch: jest.fn() }),
  refetchUnresolvedNftUris: jest.fn(async () => undefined),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const GNOT: ManagedToken = {
  id: 'ugnot', networkId: NETWORK.id, family: NETWORK.family, type: TokenType.NATIVE, name: 'Gno.land', symbol: 'GNOT', decimals: 6, denom: 'ugnot', isNative: true, visible: true, source: TokenSource.DEFAULT,
};
const PRICES: TokenPriceMap = { [`ugnot:${NETWORK.id}`]: { tokenId: 'ugnot', networkId: NETWORK.id, usd: 2, change24h: null } };

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });

  return { promise, resolve };
};

const setup = ({ pricesSupported = true } = {}) => {
  const list = deferred<ManagedToken[]>();
  const balances = deferred<Record<string, string>>();
  const prices = deferred<TokenPriceMap>();
  const tokenService = { getTokenList: jest.fn(() => list.promise), getBalances: jest.fn(() => balances.promise) };
  const priceService = { isSupported: () => pricesSupported, getPrices: jest.fn(() => prices.promise) };
  const { Wrapper, client } = createWrapper({ tokenService, priceService, nftService: { getPreferences: () => ({}) } });
  const Screen = HomeScreen as unknown as React.ComponentType<{ navigation: unknown }>;

  const view = render(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper><Screen navigation={{ navigate: jest.fn() }} /></Wrapper>
    </SafeAreaProvider>,
  );

  return { view, list, balances, prices, tokenService, client };
};

describe('HomeScreen loading', () => {
  afterEach(() => jest.useRealTimers());

  it('shows a skeleton list until the list and balances are in, then rows with balances and values at once', async () => {
    const { view, list, balances, prices } = setup();

    await view;
    expect(screen.getByLabelText('Loading tokens').props.accessibilityState).toEqual({ busy: true });

    await act(async () => list.resolve([GNOT]));
    expect(screen.getByLabelText('Loading tokens')).toBeTruthy();
    expect(screen.queryByText('Gno.land')).toBeNull();

    await act(async () => {
      balances.resolve({ ugnot: '1500000' });
      prices.resolve(PRICES);
    });

    await waitFor(() => expect(screen.queryByLabelText('Loading tokens')).toBeNull());
    expect(screen.getByText('Gno.land')).toBeTruthy();
    expect(screen.getByText('1.5 GNOT')).toBeTruthy();
    expect(screen.getAllByText('$3.00')).toHaveLength(2);
    expect(screen.queryByLabelText('Loading')).toBeNull();
  });

  it('paints rows after the price grace with a fixed value placeholder and keeps the total as a skeleton', async () => {
    jest.useFakeTimers();
    const { view, list, balances, prices } = setup();

    await view;
    await act(async () => list.resolve([GNOT]));
    await act(async () => balances.resolve({ ugnot: '1500000' }));
    await act(async () => jest.advanceTimersByTimeAsync(PRICE_GRACE_MS - 100));
    expect(screen.getByLabelText('Loading tokens')).toBeTruthy();

    await act(async () => jest.advanceTimersByTimeAsync(PRICE_GRACE_MS));
    expect(screen.queryByLabelText('Loading tokens')).toBeNull();
    expect(screen.getByText('1.5 GNOT')).toBeTruthy();
    // One placeholder for the header total, one for the row value cell.
    const placeholders = screen.getAllByLabelText('Loading');

    expect(placeholders).toHaveLength(2);
    expect(placeholders[1]).toHaveStyle({ width: 72, height: 16 });

    await act(async () => prices.resolve(PRICES));
    await act(async () => jest.advanceTimersByTimeAsync(0));
    expect(screen.queryByLabelText('Loading')).toBeNull();
    expect(screen.getAllByText('$3.00')).toHaveLength(2);
  });

  it('keeps the current rows while refetching', async () => {
    const { view, list, balances, prices, tokenService, client } = setup();

    await view;
    await act(async () => {
      list.resolve([GNOT]);
      balances.resolve({ ugnot: '1500000' });
      prices.resolve(PRICES);
    });
    await waitFor(() => expect(screen.getByText('1.5 GNOT')).toBeTruthy());

    const pending = deferred<Record<string, string>>();

    tokenService.getBalances.mockReturnValue(pending.promise);
    await act(async () => {
      client.invalidateQueries();
    });
    expect(screen.queryByLabelText('Loading tokens')).toBeNull();
    expect(screen.getByText('1.5 GNOT')).toBeTruthy();

    await act(async () => pending.resolve({ ugnot: '2500000' }));
    await waitFor(() => expect(screen.getByText('2.5 GNOT')).toBeTruthy());
    expect(screen.queryByLabelText('Loading tokens')).toBeNull();
  });

  it('keeps loaded rows when a token is added to the list', async () => {
    const { view, list, balances, prices, tokenService, client } = setup();
    const foo: ManagedToken = { ...GNOT, id: 'foo', name: 'Foo', symbol: 'FOO', type: TokenType.GRC20, isNative: false, denom: undefined };

    await view;
    await act(async () => {
      list.resolve([GNOT]);
      balances.resolve({ ugnot: '1500000' });
      prices.resolve(PRICES);
    });
    await waitFor(() => expect(screen.getByText('1.5 GNOT')).toBeTruthy());

    tokenService.getTokenList.mockResolvedValue([GNOT, foo]);
    tokenService.getBalances.mockReturnValue(new Promise(() => undefined));
    await act(async () => {
      client.invalidateQueries();
    });
    await waitFor(() => expect(screen.getByText('Foo')).toBeTruthy());
    expect(screen.queryByLabelText('Loading tokens')).toBeNull();
    expect(screen.getByText('1.5 GNOT')).toBeTruthy();
  });

  it('shows the native balance as the headline right away when prices are unsupported', async () => {
    const { view, list, balances } = setup({ pricesSupported: false });

    await view;
    await act(async () => {
      list.resolve([GNOT]);
      balances.resolve({ ugnot: '1500000' });
    });

    await waitFor(() => expect(screen.queryByLabelText('Loading tokens')).toBeNull());
    expect(screen.getAllByText('1.5 GNOT')).toHaveLength(2);
    expect(screen.queryByLabelText('Loading')).toBeNull();
  });
});
