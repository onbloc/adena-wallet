import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useMemo } from 'react';

import { NftCollectionPage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useNftImages } from '../../../hooks/use-nft-images';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { useNftItemsQuery } from '../../../queries/nft.queries';

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
      countLabel={`${collection.ownedCount} owned · ${collection.symbol}`}
      items={items.map(item => ({
        key: item.nftId,
        title: `${item.name} #${item.nftId}`,
        subtitle: item.symbol,
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
    />
  );
};
