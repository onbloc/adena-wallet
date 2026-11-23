import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TokenDetailsPage } from '../src/components/pages';
import { CHART_RANGES } from '../src/domain/market';
import { MockMarketDataRepository } from '../src/repositories/market-data.repository';
import { BUILT_IN_NETWORKS, getNativeTokenFor } from '../src/resources';
import { formatCompactUSD, formatTokenPriceUSD } from '../src/utils/price';
import { API_URL, createTestContainer } from './helpers/test-container';

const network = BUILT_IN_NETWORKS[0];
const gnot = getNativeTokenFor(network);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

describe('MockMarketDataRepository', () => {
  const repository = new MockMarketDataRepository(() => 1_700_000_000_000);

  it('is deterministic per token and range, flagged as sample data', async () => {
    const a = await repository.getMarketData({ token: gnot, network, range: '1D' });
    const b = await repository.getMarketData({ token: gnot, network, range: '1D' });

    expect(a).toEqual(b);
    expect(a.isSample).toBe(true);
    expect(a.chart).toHaveLength(96);
    expect(a.chart[a.chart.length - 1].timestamp).toBe(1_700_000_000_000);
  });

  it('ends the series at the live price when one is provided', async () => {
    const data = await repository.getMarketData({ token: gnot, network, range: '1W', referencePriceUsd: 0.0509 });

    expect(data.priceUsd).toBe(0.0509);
    expect(data.chart[data.chart.length - 1].priceUsd).toBe(0.0509);
    expect(data.stats.low52wUsd).toBeLessThan(0.0509);
  });
});

describe('MarketDataService', () => {
  it('anchors the mock to the price feed and adds wallet links', async () => {
    const env = createTestContainer();

    env.http.on(`${API_URL}/v1/prices`, { data: { items: [{ assetId: 'gno-land', provider: 'CMC', quoteCurrency: 'USD', price: '0.05', status: 'fresh', changeRateOneDay: 1 }] } });
    const data = await env.container.marketDataService.getMarketData(gnot, network, '1M');

    expect(data.priceUsd).toBe(0.05);
    const wugnot = { ...gnot, id: 'gno.land/r/gnoland/wugnot.wugnot', type: 'grc20' as const, isNative: false, websiteUrl: 'https://gno.land/r/gnoland/wugnot' };
    const links = (await env.container.marketDataService.getMarketData(wugnot, network, '1D')).links.map(link => link.label);

    expect(links).toEqual(['Gnoscan', 'Website']);
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
  it('shows the sample badge, stats and switches ranges', async () => {
    const onRangeChange = jest.fn();

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
            isSample: true,
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
          onOpenLink={jest.fn()}
          onBack={jest.fn()}
        />
      </SafeAreaProvider>,
    );
    expect(screen.getByText('Sample data')).toBeTruthy();
    expect(screen.getByText('About Gno.land')).toBeTruthy();
    expect(screen.getByText('$10.0M')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: '1W' }));
    expect(onRangeChange).toHaveBeenCalledWith('1W');
  });
});
