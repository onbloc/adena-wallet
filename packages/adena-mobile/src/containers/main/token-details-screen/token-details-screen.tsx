import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useMemo, useState } from 'react';
import { Linking } from 'react-native';

import { TokenDetailsPage, TokenMarketView } from '../../../components/pages';
import { ActivityFilter, ActivityFilterKind } from '../../../domain/activity';
import { CHART_RANGES, ChartRange } from '../../../domain/market';
import { tokenPriceKey, TokenType } from '../../../domain/token';
import { useActivityList } from '../../../hooks/use-activity-list';
import { usePullToRefresh } from '../../../hooks/use-pull-to-refresh';
import { useWalletAssets } from '../../../hooks/use-wallet-assets';
import { MainStackParamList } from '../../../navigation/types';
import { toAssetItem, toAssetView } from '../../../presenters/asset.presenter';
import { useMarketDataQuery } from '../../../queries/market.queries';
import { useTokenBalancesQuery, useTokenPricesQuery } from '../../../queries/token.queries';
import { formatChangeRate, formatCompactUSD, formatTokenPriceUSD } from '../../../utils/price';

const RANGE_CAPTION: Record<ChartRange, string> = { [ChartRange.ONE_HOUR]: 'Past hour', [ChartRange.ONE_DAY]: 'Today', [ChartRange.ONE_WEEK]: 'Past week', [ChartRange.ONE_MONTH]: 'Past month', [ChartRange.ONE_YEAR]: 'Past year' };

export const TokenDetailsScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'TokenDetails'>): ReactElement | null => {
  const { tokenId } = route.params;
  const { account, network, allTokens } = useWalletAssets();
  const token = allTokens.find(item => item.id === tokenId);
  const tokens = useMemo(() => (token ? [token] : []), [token]);
  const balances = useTokenBalancesQuery(account, network, tokens);
  const prices = useTokenPricesQuery(network, tokens);
  const [range, setRange] = useState<ChartRange>(ChartRange.ONE_DAY);
  const market = useMarketDataQuery(token, network, range);

  const filter: ActivityFilter = useMemo(() => (token?.type === TokenType.GRC20
    ? { kind: ActivityFilterKind.GRC20, tokenId: token.id, pkgPath: token.pkgPath ?? '' }
    : { kind: ActivityFilterKind.NATIVE, denom: token?.denom ?? network.nativeToken.denom }), [network.nativeToken.denom, token]);
  const activity = useActivityList(filter, allTokens, item => navigation.navigate('ActivityDetail', { activity: item }));

  const pull = usePullToRefresh(() => Promise.all([balances.refetch(), market.refetch(), activity.refetch()]));

  if (!token) {
    return null;
  }

  const view = toAssetView(token, balances.data?.[token.id], prices.data?.[tokenPriceKey(token.id, network.id)], balances.isPending);
  const data = market.data;
  const marketView: TokenMarketView = {
    priceLabel: data ? formatTokenPriceUSD(data.priceUsd) : undefined,
    changeLabel: data ? `${formatChangeRate(data.changePercent)} · ${RANGE_CAPTION[range]}` : undefined,
    changeColor: !data || Math.abs(data.changePercent) < 0.01 ? 'secondary' : data.changePercent > 0 ? 'success' : 'error',
    chart: data?.chart.map(point => point.priceUsd) ?? [],
    loading: market.isPending,
    isSample: Boolean(data?.isSample),
    stats: [
      { label: 'Market cap', value: formatCompactUSD(data?.stats.marketCapUsd) },
      { label: 'Fully diluted valuation', value: formatCompactUSD(data?.stats.fullyDilutedValuationUsd) },
      { label: '24h volume', value: formatCompactUSD(data?.stats.volume24hUsd) },
      { label: '52W high', value: data?.stats.high52wUsd === undefined ? '-' : formatTokenPriceUSD(data.stats.high52wUsd) },
      { label: '52W low', value: data?.stats.low52wUsd === undefined ? '-' : formatTokenPriceUSD(data.stats.low52wUsd) },
    ],
    links: data?.links ?? [],
  };

  const handleSend = (): void => navigation.navigate('SendRecipient', { tokenId: token.id });

  const handleReceive = (): void => navigation.navigate('Receive');

  const handleOpenLink = (url: string): false | Promise<void> => url.startsWith('https://') && Linking.openURL(url);

  return (
    <TokenDetailsPage
      asset={toAssetItem(view)}
      about={data?.about}
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
