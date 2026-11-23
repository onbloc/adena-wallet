import { QueryClient } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { TokenDetailsScreen } from '../../../src/containers/main/token-details-screen';
import { ChartRange, TokenMarketData, TokenMarketInfo } from '../../../src/domain/market';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';
import { API_URL, RESOURCE_BASE } from '../../helpers/test-container';

const PERUN = 'gno.land/r/demo/defi/grc20factory.PERUN';
const client = (): QueryClient => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });

const historyItem = (address: string) => ({
  amountIn: { denom: 'ugnot', value: '1500000' },
  amountOut: { denom: 'ugnot', value: '0' },
  blockHeight: 10,
  fee: { denom: 'ugnot', value: '1000' },
  func: [{ funcType: '', messageType: '/bank.MsgSend', pkgPath: '' }],
  isGRC20Transfer: false,
  isGRC721Transfer: false,
  messageCount: 1,
  successYn: true,
  timestamp: '2026-11-20T10:00:00Z',
  fromAddress: 'g1other',
  toAddress: address,
  txHash: 'AB'.repeat(32),
});

const market = (range: ChartRange, changePercent: number, extra: Partial<TokenMarketData> = {}): TokenMarketData => ({
  tokenId: 'ugnot',
  networkId: 'gnoland-1',
  range,
  priceUsd: 0.05,
  changePercent,
  chart: [{ timestamp: 1, priceUsd: 0.04 }, { timestamp: 2, priceUsd: 0.05 }],
  ...extra,
});

const info = (): TokenMarketInfo => ({
  tokenId: 'ugnot',
  networkId: 'gnoland-1',
  stats: { marketCapUsd: 10_000_000, high52wUsd: 0.09, low52wUsd: 0.01 },
  links: [{ label: 'Website', url: 'https://gno.land' }, { label: 'Insecure', url: 'http://gno.land' }],
  about: 'Gno.land is a platform for smart contracts.',
});

const setup = async () => {
  const wallet = await setupWallet();

  wallet.env.http
    .on(`${RESOURCE_BASE}/gno-native/gnoland-1.json`, [{ denom: 'ugnot', name: 'Gno.land', symbol: 'GNOT', decimals: 6 }])
    .on(`${RESOURCE_BASE}/grc20/gnoland-1.json`, [])
    .on(`${API_URL}/v1/prices`, { data: { items: [] } })
    .on(`${API_URL}/v1/accounts/${wallet.address}`, {
      data: { assets: [{ tokenType: 'GRC20', tokenId: PERUN, tokenKey: PERUN, packagePath: 'gno.land/r/demo/defi/grc20factory', name: 'Perun', symbol: 'PERUN', decimals: 6, amount: '5', logoUrl: null }] },
    })
    .on(`${API_URL}/v1/accounts/${wallet.address}/native-coin/transactions`, { data: { items: [historyItem(wallet.address)], page: { hasNext: false } } })
    .on(`${API_URL}/v1/accounts/${wallet.address}/grc20-token/${encodeURIComponent(PERUN)}/transactions`, { data: { items: [], page: { hasNext: false } } });
  wallet.env.gno.state.balances[wallet.address] = '2500000ugnot';
  wallet.env.gno.state.evaluate = (): string => '(true bool)\n(7000000 int64)';
  return wallet;
};

jest.setTimeout(30_000);

describe('TokenDetailsScreen', () => {
  const openURL = jest.mocked(Linking.openURL);

  beforeEach(() => {
    resetStores();
    openURL.mockReset().mockResolvedValue(undefined);
  });

  it('shows native market data, switches ranges and opens only https links', async () => {
    const { env, address } = await setup();
    const changes: Partial<Record<ChartRange, number>> = { '1D': 5, '1W': -3, '1M': 0.001 };
    const getMarketData = jest.spyOn(env.container.marketDataService, 'getMarketData')
      .mockImplementation(async (_token, _network, range) => market(range, changes[range] ?? 0));

    jest.spyOn(env.container.marketDataService, 'getTokenInfo').mockResolvedValue(info());
    const { navigation, container } = await renderScreen(TokenDetailsScreen, { env, client: client(), params: { tokenId: 'ugnot' } });

    expect(await screen.findByText('+5.00% · Today', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByText('$0.09')).toBeTruthy();
    expect(screen.getByText('2.5 GNOT')).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: '1W' }));
    expect(await screen.findByText('-3.00% · Past week')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: '1M' }));
    expect(await screen.findByText(/· Past month/)).toBeTruthy();

    await fireEvent.press(screen.getByText('Website'));
    expect(openURL).toHaveBeenCalledWith('https://gno.land');
    await fireEvent.press(screen.getByText('Insecure'));
    expect(openURL).toHaveBeenCalledTimes(1);

    await fireEvent.press(await screen.findByRole('button', { name: /^Receive, / }));
    expect(navigation.navigate).toHaveBeenCalledWith('ActivityDetail', { activity: expect.objectContaining({ hash: 'ab'.repeat(32), to: address }) });

    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    expect(navigation.navigate).toHaveBeenCalledWith('SendRecipient', { tokenId: 'ugnot' });
    await fireEvent.press(screen.getByRole('button', { name: 'Receive' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Receive');

    const calls = getMarketData.mock.calls.length;
    const [refresh] = container.queryAll(node => node.type === 'RCTRefreshControl');

    await fireEvent(refresh, 'refresh');
    await waitFor(() => expect(getMarketData.mock.calls.length).toBeGreaterThan(calls));

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('loads GRC20 activity and shows placeholders while the market is pending', async () => {
    const { env } = await setup();

    jest.spyOn(env.container.marketDataService, 'getMarketData').mockReturnValue(new Promise(() => undefined));
    jest.spyOn(env.container.marketDataService, 'getTokenInfo').mockReturnValue(new Promise(() => undefined));
    await renderScreen(TokenDetailsScreen, { env, client: client(), params: { tokenId: PERUN } });

    expect(await screen.findByText('No activity yet')).toBeTruthy();
    expect(screen.getByText('Perun')).toBeTruthy();
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(5);
    expect(env.http.calls).toContain(`${API_URL}/v1/accounts/${env.container.accountService.getAddress(env.container.accountService.getCurrentAccount()!, env.container.networkService.getCurrentNetwork())}/grc20-token/${encodeURIComponent(PERUN)}/transactions`);
  });

  it('renders nothing for an unknown token', async () => {
    const { env } = await setup();

    await renderScreen(TokenDetailsScreen, { env, client: client(), params: { tokenId: 'unknown' } });

    expect(screen.queryByText('Token details')).toBeNull();
  });
});
