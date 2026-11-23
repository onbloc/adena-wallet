import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Text } from '../../atoms';
import { EmptyState, InlineAlert, NftCard, Screen, TopBar } from '../../molecules';
import { NftCardView } from '../../view-models';
import { styles } from './nft-collection.styles';

export interface NftCollectionPageProps {
  name: string;
  countLabel: string;
  items: NftCardView[];
  loading: boolean;
  error?: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onOpen: (nftId: string) => void;
  onBack: () => void;
}

export const NftCollectionPage = (props: NftCollectionPageProps): ReactElement => (
  <Screen header={<TopBar title={props.name} onBack={props.onBack} />}>
    <Text variant='meta' color='secondary'>{props.countLabel}</Text>
    {props.error && <InlineAlert tone='error' title='Unable to load collectibles' description={props.error} />}
    {!props.loading && props.items.length === 0 && !props.error && <EmptyState title='No collectibles' />}
    <View style={styles.grid}>
      {props.items.map((item) => {
        const handlePress = (): void => props.onOpen(item.key);

        return (
          <View key={item.key} style={styles.cell}>
            <NftCard title={item.title} subtitle={item.subtitle} imageUri={item.imageUri} imageLoading={item.imageLoading} onPress={handlePress} />
          </View>
        );
      })}
    </View>
    {props.hasMore && <Button label='Load more' tone='secondary' size='compact' loading={props.loadingMore} loadingLabel='Loading…' onPress={props.onLoadMore} />}
  </Screen>
);
