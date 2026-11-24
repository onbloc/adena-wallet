import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useMemo, useState } from 'react';

import { NftCollectionPage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useNftImages } from '../../../hooks/use-nft-images';
import { usePullToRefresh } from '../../../hooks/use-pull-to-refresh';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { refetchUnresolvedNftUris, useNftItemsQuery } from '../../../queries/nft.queries';

export const NftCollectionScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'NftCollection'>): ReactElement => {
  const { collection } = route.params;
  const { account, network } = useWalletSnapshot();
  const itemsQuery = useNftItemsQuery(account, network, collection);
  const items = useMemo(() => itemsQuery.data?.pages.flatMap(page => page.items) ?? [], [itemsQuery.data]);
  const images = useNftImages(network, items.map(item => ({
    key: item.nftId,
    packagePath: item.packagePath,
    nftId: item.nftId,
    enabled: collection.supportsTokenUri,
  })));
  const thumbnail = useNftImages(network, [{
    key: collection.id,
    packagePath: collection.packagePath,
    nftId: collection.thumbnailNftId,
    enabled: collection.supportsTokenUri,
  }])[collection.id];

  const queryClient = useQueryClient();
  const [imageRetryKey, setImageRetryKey] = useState(0);
  const pull = usePullToRefresh(() => {
    setImageRetryKey(key => key + 1);
    return Promise.all([itemsQuery.refetch(), refetchUnresolvedNftUris(queryClient, network.id)]);
  });

  const handleLoadMore = (): void => {
    itemsQuery.fetchNextPage();
  };

  const handleOpen = (nftId: string): void => {
    const item = items.find(entry => entry.nftId === nftId);

    if (item) {
      navigation.navigate('NftDetail', { collection, item });
    }
  };

  return (
    <NftCollectionPage
      name={collection.name}
      subtitle={collection.packagePath}
      thumbnailUri={thumbnail?.uri}
      thumbnailLoading={thumbnail?.loading}
      stats={[
        { label: 'Owned', value: String(collection.ownedCount) },
        { label: 'Symbol', value: collection.symbol },
        { label: 'Network', value: network.networkName },
      ]}
      items={items.map(item => ({
        key: item.nftId,
        title: `#${item.nftId}`,
        subtitle: item.name,
        imageUri: images[item.nftId]?.uri,
        imageLoading: images[item.nftId]?.loading ?? false,
      }))}
      loading={itemsQuery.isPending}
      error={itemsQuery.error ? toErrorMessage(itemsQuery.error) : undefined}
      hasMore={Boolean(itemsQuery.hasNextPage)}
      loadingMore={itemsQuery.isFetchingNextPage}
      onLoadMore={handleLoadMore}
      onOpen={handleOpen}
      onBack={navigation.goBack}
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
      imageRetryKey={imageRetryKey}
    />
  );
};
