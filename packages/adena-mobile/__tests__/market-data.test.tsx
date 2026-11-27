import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TokenDetailsPage } from '../src/components/pages';
import { CHART_RANGES } from '../src/domain/market';
import { BUILT_IN_NETWORKS, getNativeTokenFor } from '../src/resources';
import { formatCompactUSD, formatTokenPriceUSD } from '../src/utils/price';
import { createTestContainer } from './helpers/test-container';

const network = BUILT_IN_NETWORKS[0];
const gnot = getNativeTokenFor(network);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

describe('MarketDataService with the bundled DEX config', () => {
  const API = 'https://api.gnoswap.io/v1';

  it('loads the mainnet chart from GnoSwap through the wrapped native token', async () => {
    const now = Date.parse('2026-11-24T05:27:30Z');
    const env = createTestContainer({ now: () => now });
    const end = Math.floor(now / 1000 / 900) * 900 + 900;
    const wugnot = 'gno.land/r/gnoland/wugnot.wugnot';

    env.http.on(`${API}/token-metas/ugnot`, { data: { path: 'ugnot', description: 'Gno.land', wrappedPath: wugnot } });
    env.http.on(`${API}/tokens/${encodeURIComponent(wugnot)}/ohlcv?interval=900&start=${end - 86_400}&end=${end}`, {
      data: [{ start: new Date((end - 900) * 1000).toISOString(), open: '0.05', high: '0.06', low: '0.05', close: '0.0525', volume: '1' }],
    });
    const data = await env.container.marketDataService.getMarketData(gnot, network, '1D');

    expect(data.priceUsd).toBe(0.0525);
    expect(data.changePercent).toBeCloseTo(5);
    // Onyx and GnoSwap Dev serve OHLCV on their own GnoSwap hosts; AtomOne has no DEX.
    expect(env.container.marketDataService.isSupported(BUILT_IN_NETWORKS.find(item => item.id === 'onyx-1')!)).toBe(true);
    expect(env.container.marketDataService.isSupported(BUILT_IN_NETWORKS.find(item => item.id === 'atomone-1')!)).toBe(false);
  });
});

describe('price formatting', () => {
  it('formats compact stats and sub-dollar prices', () => {
    expect(formatCompactUSD(452_400_000_000_000)).toBe('$452.4T');
    expect(formatCompactUSD(18_250_000_000)).toBe('$18.2B');
    expect(formatCompactUSD(undefined)).toBe('-');
    expect(formatTokenPriceUSD(0.050902104)).toBe('$0.0509');
    expect(formatTokenPriceUSD(3770.129)).toBe('$3,770.12');
  });
});

describe('TokenDetailsPage', () => {
  it('shows stats and switches ranges', async () => {
    const onRangeChange = jest.fn();
    const onBuy = jest.fn();

    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <TokenDetailsPage
          asset={{ key: 'ugnot', symbol: 'GNOT', name: 'Gno.land', quantity: '1.5 GNOT', trend: 'neutral', loading: false }}
          about='Gno.land is a platform for smart contracts.'
          market={{
            priceLabel: '$0.0509',
            changeLabel: '+0.71% · Today',
            changeColor: 'success',
            chart: [1, 2, 3],
            loading: false,
            stats: [{ label: 'Market cap', value: '$10.0M' }],
            links: [{ label: 'Website', url: 'https://gno.land' }],
          }}
          ranges={CHART_RANGES}
          range='1D'
          onRangeChange={onRangeChange}
          activity={{ sections: [], loading: false, supported: true, hasMore: false, loadingMore: false, onLoadMore: jest.fn(), onOpen: jest.fn() }}
          refreshing={false}
          onRefresh={jest.fn()}
          onSend={jest.fn()}
          onReceive={jest.fn()}
          onBuy={onBuy}
          onOpenLink={jest.fn()}
          onBack={jest.fn()}
        />
      </SafeAreaProvider>,
    );
    expect(screen.getByText('About Gno.land')).toBeTruthy();
    expect(screen.getByText('$10.0M')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: '1W' }));
    expect(onRangeChange).toHaveBeenCalledWith('1W');
    await fireEvent.press(screen.getByRole('button', { name: 'Buy' }));
    expect(onBuy).toHaveBeenCalledTimes(1);
  });
});
