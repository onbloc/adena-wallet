import React, { ReactElement, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Spinner, Text, TextColor } from '../../atoms';
import {
  ActivityList,
  ActivityListProps,
  Card,
  EmptyState,
  KeyValueRow,
  ListRow,
  PriceChart,
  RangeSelector,
  SectionLabel,
  TokenImage,
  TopBar,
} from '../../molecules';
import { AssetItemView } from '../../view-models';
import { styles } from './token-details.styles';

export interface TokenMarketView {
  priceLabel?: string;
  changeLabel?: string;
  changeColor: TextColor;
  chart: number[];
  loading: boolean;
  // Shown in place of the chart when there is no price history.
  emptyLabel?: string;
  stats: { label: string; value: string }[];
  // `host` is shown under the label so the destination is visible before opening.
  links: { label: string; url: string; host?: string }[];
}

export interface TokenDetailsPageProps<R extends string> {
  asset: AssetItemView;
  about?: string;
  market: TokenMarketView;
  ranges: R[];
  range: R;
  onRangeChange: (range: R) => void;
  balanceValueLabel?: string;
  activity: ActivityListProps;
  refreshing: boolean;
  onRefresh: () => void;
  onSend: () => void;
  onReceive: () => void;
  onOpenLink: (url: string) => void;
  onBack: () => void;
}

const ABOUT_PREVIEW_LINES = 3;

// Layout follows the "Token details" design: price, chart, ranges, About, Stats, Links, then balance and activity.
export const TokenDetailsPage = <R extends string>(props: TokenDetailsPageProps<R>): ReactElement => {
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const { asset, market } = props;

  const handlePressablePress = (): void => setAboutExpanded(value => !value);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <TopBar title='Token details' onBack={props.onBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps='handled' refreshControl={<RefreshControl refreshing={props.refreshing} onRefresh={props.onRefresh} />}>
        <View style={styles.identity}>
          <TokenImage symbol={asset.symbol} localIcon={asset.localIcon} imageUrl={asset.imageUrl} size={40} />
          <View style={styles.names}>
            <Text variant='row'>{asset.name}</Text>
            <Text variant='meta' color='secondary'>{asset.symbol}</Text>
          </View>
        </View>

        <View style={styles.price}>
          <Text variant='display' tabular adjustsFontSizeToFit numberOfLines={1}>{market.priceLabel ?? '–'}</Text>
          {market.changeLabel && <Text variant='meta' color={market.changeColor} tabular>{market.changeLabel}</Text>}
        </View>
        <PriceChart values={market.chart} loading={market.loading} emptyLabel={market.emptyLabel} accessibilityLabel={`${asset.symbol} price chart`} />
        <RangeSelector options={props.ranges} selected={props.range} onSelect={props.onRangeChange} />

        {props.about && (
          <View style={styles.section}>
            <Text variant='section'>{`About ${asset.name}`}</Text>
            <Text variant='body' numberOfLines={aboutExpanded ? undefined : ABOUT_PREVIEW_LINES}>{props.about}</Text>
            <Pressable accessibilityRole='button' onPress={handlePressablePress} style={styles.readMore}>
              <Text variant='button'>{aboutExpanded ? 'Show less' : 'Read more'}</Text>
            </Pressable>
          </View>
        )}

        {market.stats.length > 0 && (
          <View style={styles.section}>
            <SectionLabel label='Stats' />
            {market.stats.map(stat => <KeyValueRow key={stat.label} label={stat.label} value={stat.value} emphasis />)}
          </View>
        )}

        {market.links.length > 0 && (
          <View style={styles.section}>
            <SectionLabel label='Links' />
            {market.links.map((link) => {
              const handlePress = (): void => props.onOpenLink(link.url);

              return (
                <ListRow key={link.url} label={link.label} description={link.host} leadingIcon='link' onPress={handlePress} />
              );
            })}
          </View>
        )}

        <Card title='Your balance'>
          <KeyValueRow label={asset.symbol} value={asset.quantity ?? '–'} emphasis />
          {props.balanceValueLabel && <KeyValueRow label='Value' value={props.balanceValueLabel} />}
        </Card>

        <View style={styles.section}>
          <SectionLabel label='Activity' />
          <ActivityList {...props.activity} />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button label='Send' tone='secondary' style={styles.action} onPress={props.onSend} />
        <Button label='Receive' style={styles.action} onPress={props.onReceive} />
      </View>
    </SafeAreaView>
  );
};

export interface TokenDetailsUnavailablePageProps {
  // `true` while the token list is still loading; otherwise the token is not on this network.
  loading: boolean;
  onBack: () => void;
}

export const TokenDetailsUnavailablePage = ({ loading, onBack }: TokenDetailsUnavailablePageProps): ReactElement => (
  <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
    <TopBar title='Token details' onBack={onBack} />
    <View style={styles.content}>
      {loading
        ? <View style={styles.unavailable} accessibilityLabel='Loading token'><Spinner /></View>
        : <EmptyState title='Token not found' description='This token isn’t available on the current network.' actionLabel='Go back' onAction={onBack} />}
    </View>
  </SafeAreaView>
);
