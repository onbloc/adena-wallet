import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useMemo, useState } from 'react';
import { Linking } from 'react-native';

import { TokenDetailsPage, TokenDetailsUnavailablePage, TokenMarketView } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { ActivityFilter, ActivityFilterKind } from '../../../domain/activity';
import { CHART_RANGES, ChartRange } from '../../../domain/market';
import { tokenPriceKey, TokenType } from '../../../domain/token';
import { useActivityList } from '../../../hooks/use-activity-list';
import { usePullToRefresh } from '../../../hooks/use-pull-to-refresh';
import { useWalletAssets } from '../../../hooks/use-wallet-assets';
import { MainStackParamList } from '../../../navigation/types';
import { toAssetItem, toAssetView } from '../../../presenters/asset.presenter';
import { useMarketDataQuery, useTokenInfoQuery } from '../../../queries/market.queries';
import { useTokenBalancesQuery, useTokenPricesQuery } from '../../../queries/token.queries';
import { useToastStore } from '../../../stores/toast.store';
import { formatChangeRate, formatCompactUSD, formatTokenPriceUSD } from '../../../utils/price';
import { hostOf } from '../../../utils/url';

const RANGE_CAPTION: Record<ChartRange, string> = { [ChartRange.ONE_HOUR]: 'Past hour', [ChartRange.ONE_DAY]: 'Today', [ChartRange.ONE_WEEK]: 'Past week', [ChartRange.ONE_MONTH]: 'Past month', [ChartRange.ONE_YEAR]: 'Past year' };

export const TokenDetailsScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'TokenDetails'>): ReactElement => {
  const { tokenId } = route.params;
  const { account, network, allTokens, tokensLoading } = useWalletAssets();
  const showToast = useToastStore(state => state.show);
  const { marketDataService } = useContainer();
  const token = allTokens.find(item => item.id === tokenId);
  const tokens = useMemo(() => (token ? [token] : []), [token]);
  const balances = useTokenBalancesQuery(account, network, tokens);
  const prices = useTokenPricesQuery(network, tokens);
  const [range, setRange] = useState<ChartRange>(ChartRange.ONE_DAY);
  const market = useMarketDataQuery(token, network, range);
  const info = useTokenInfoQuery(token, network);

  const filter: ActivityFilter = useMemo(() => (token?.type === TokenType.GRC20
    ? { kind: ActivityFilterKind.GRC20, tokenId: token.id, pkgPath: token.pkgPath ?? '' }
    : { kind: ActivityFilterKind.NATIVE, denom: token?.denom ?? network.nativeToken.denom }), [network.nativeToken.denom, token]);
  const activity = useActivityList(filter, allTokens, item => navigation.navigate('ActivityDetail', { activity: item }));

  const pull = usePullToRefresh(() => Promise.all([balances.refetch(), market.refetch(), info.refetch(), activity.refetch()]));

  if (!token) {
    return <TokenDetailsUnavailablePage loading={tokensLoading} onBack={navigation.goBack} />;
  }

  const view = toAssetView(token, balances.data?.[token.id], prices.data?.[tokenPriceKey(token.id, network.id)], balances.isPending);
  // Header, chart and info sections wait for both first loads; a range switch only dims the current values.
  const firstLoad = market.isPending || info.isPending;
  const data = market.data;
  const stats = info.data?.stats;
  const priceUsd = data?.priceUsd ?? prices.data?.[tokenPriceKey(token.id, network.id)]?.usd;
  const change = data?.changePercent;
  const statRows: { label: string; value: number | undefined; format: (value: number) => string }[] = [
    { label: 'Market cap', value: stats?.marketCapUsd, format: formatCompactUSD },
    { label: 'Fully diluted valuation', value: stats?.fullyDilutedValuationUsd, format: formatCompactUSD },
    { label: '24h volume', value: stats?.volume24hUsd, format: formatCompactUSD },
    { label: '52W high', value: stats?.high52wUsd, format: formatTokenPriceUSD },
    { label: '52W low', value: stats?.low52wUsd, format: formatTokenPriceUSD },
  ];
  const marketView: TokenMarketView = {
    priceLabel: priceUsd === undefined ? undefined : formatTokenPriceUSD(priceUsd),
    changeLabel: change === undefined ? undefined : `${formatChangeRate(change)} · ${RANGE_CAPTION[range]}`,
    changeColor: change === undefined || Math.abs(change) < 0.01 ? 'secondary' : change > 0 ? 'success' : 'error',
    chart: data?.chart.map(point => point.priceUsd) ?? [],
    loading: firstLoad,
    updating: !firstLoad && market.isPlaceholderData && market.isFetching,
    emptyLabel: market.isError ? 'Price history could not be loaded' : marketDataService.isSupported(network) ? 'No price history yet' : 'Price history is not available on this network',
    // Rows without a value are hidden rather than shown as placeholders.
    stats: firstLoad ? [] : statRows.flatMap(row => (row.value === undefined ? [] : [{ label: row.label, value: row.format(row.value) }])),
    links: firstLoad ? [] : (info.data?.links ?? []).map(link => ({ ...link, host: hostOf(link.url) })),
  };

  const handleSend = (): void => navigation.navigate('SendRecipient', { tokenId: token.id });

  const handleReceive = (): void => navigation.navigate('Receive');

  const handleOpenLink = (url: string): void => {
    if (url.startsWith('https://')) {
      Linking.openURL(url).catch(() => showToast('Couldn’t open the link', 'error'));
    }
  };

  return (
    <TokenDetailsPage
      asset={toAssetItem(view)}
      about={firstLoad ? undefined : info.data?.about ?? token.description}
      market={marketView}
      ranges={CHART_RANGES}
      range={range}
      onRangeChange={setRange}
      balanceValueLabel={view.valueLabel}
      activity={activity.listProps}
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
      onSend={handleSend}
      onReceive={handleReceive}
      onOpenLink={handleOpenLink}
      onBack={navigation.goBack}
    />
  );
};
