import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement } from 'react';

import { NftDetailPage } from '../../../components/pages';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { useNftMetadataQuery, useNftTokenUriQuery } from '../../../queries/nft.queries';

export const NftDetailScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'NftDetail'>): ReactElement => {
  const { collection, item } = route.params;
  const { account, network } = useWalletSnapshot();
  const uri = useNftTokenUriQuery(network, item.packagePath, item.nftId, collection.supportsTokenUri);
  const metadata = useNftMetadataQuery(network, item.packagePath, item.nftId, collection.supportsMetadata);
  const meta = metadata.data;

  // Details open from the collection page, so return to it instead of stacking another copy.
  const handleOpenCollection = (): void => navigation.popTo('NftCollection', { collection });

  const handleSend = (): void => navigation.navigate('SendNft', { collection, item });

  return (
    <NftDetailPage
      name={meta?.name ?? `${item.name} #${item.nftId}`}
      collectionName={collection.name}
      collectionDescription={collection.packagePath}
      imageUri={uri.data ?? meta?.image}
      imageLoading={collection.supportsTokenUri && uri.isPending}
      description={meta?.description}
      rows={[
        { label: 'Token ID', value: item.nftId },
        { label: 'Network', value: network.networkName },
        { label: 'Owned by', value: account?.name ?? '-' },
      ]}
      traits={(meta?.attributes ?? []).map(attribute => ({ label: attribute.traitType, value: attribute.value }))}
      onOpenCollection={handleOpenCollection}
      onSend={handleSend}
      onBack={navigation.goBack}
    />
  );
};
