import React, { ReactElement } from 'react';
import { RefreshControl, View } from 'react-native';

import { useRefreshControlColors } from '../../../theme';
import { Avatar, Button, Text } from '../../atoms';
import { EmptyState, InlineAlert, NftCard, NftImage, Screen, TopBar } from '../../molecules';
import { NftCardView } from '../../view-models';
import { styles } from './nft-collection.styles';

const COLUMNS = 3;

export interface NftCollectionPageProps {
  name: string;
  subtitle?: string;
  thumbnailUri?: string | null;
  thumbnailLoading?: boolean;
  stats: { label: string; value: string }[];
  items: NftCardView[];
  loading: boolean;
  error?: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onOpen: (nftId: string) => void;
  onBack: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  // Bumped per refresh so artwork that failed to render is tried again.
  imageRetryKey?: number;
}

const toRows = (items: NftCardView[]): NftCardView[][] =>
  Array.from({ length: Math.ceil(items.length / COLUMNS) }, (_, index) => items.slice(index * COLUMNS, (index + 1) * COLUMNS));

export const NftCollectionPage = (props: NftCollectionPageProps): ReactElement => {
  const refreshColors = useRefreshControlColors();

  return (
    <Screen
      header={<TopBar title='NFT collection' variant='root' onBack={props.onBack} />}
      refreshControl={props.onRefresh ? <RefreshControl {...refreshColors} refreshing={props.refreshing ?? false} onRefresh={props.onRefresh} /> : undefined}
    >
      <View style={styles.identity}>
        <View style={styles.thumbnail}>
          {props.thumbnailUri || props.thumbnailLoading
            ? <NftImage uri={props.thumbnailUri} loading={props.thumbnailLoading} retryKey={props.imageRetryKey} />
            : <Avatar name={props.name} size={styles.thumbnail.width} />}
        </View>
        <View style={styles.names}>
          <Text variant='title' numberOfLines={1} accessibilityRole='header'>{props.name}</Text>
          {props.subtitle && <Text variant='meta' color='secondary' numberOfLines={1}>{props.subtitle}</Text>}
        </View>
      </View>
      {props.stats.length > 0 && (
        <View style={styles.stats}>
          {props.stats.map(stat => (
            <View key={stat.label} style={styles.stat}>
              <Text variant='row' tabular numberOfLines={1}>{stat.value}</Text>
              <Text variant='meta' color='secondary' numberOfLines={1}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}
      <Text variant='section' accessibilityRole='header'>Items</Text>
      {props.error && <InlineAlert tone='error' title='Unable to load collectibles' description={props.error} />}
      {!props.loading && props.items.length === 0 && !props.error && <EmptyState title='No collectibles' />}
      {toRows(props.items).map(row => (
        <View key={row[0].key} style={styles.row}>
          {row.map((item) => {
            const handlePress = (): void => props.onOpen(item.key);

            return (
              <View key={item.key} style={styles.cell}>
                <NftCard compact title={item.title} subtitle={item.subtitle} imageUri={item.imageUri} imageLoading={item.imageLoading} imageRetryKey={props.imageRetryKey} onPress={handlePress} />
              </View>
            );
          })}
          {/* Fillers keep the last row on the same column grid. */}
          {Array.from({ length: COLUMNS - row.length }, (_, index) => <View key={`filler-${index}`} style={styles.cell} />)}
        </View>
      ))}
      {props.hasMore && <Button label='Load more' tone='secondary' size='compact' loading={props.loadingMore} loadingLabel='Loading…' onPress={props.onLoadMore} />}
    </Screen>
  );
};
