import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement } from 'react';

import { ManageNftsPage } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { useNftCollectionsQuery } from '../../../queries/nft.queries';
import { useSessionStore } from '../../../stores/session.store';

export const ManageNftsScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'ManageNfts'>): ReactElement => {
  const { nftService } = useContainer();
  const { account, network } = useWalletSnapshot();
  const bumpRevision = useSessionStore(state => state.bumpRevision);
  const collections = useNftCollectionsQuery(account, network);
  const preferences = account ? nftService.getPreferences(account, network) : { hidden: [], pinned: [] };

  const handleToggleVisible = (packagePath: string, visible: boolean): void => {
    if (account) {
      nftService.setHidden(account, network, packagePath, !visible);
      bumpRevision();
    }
  };

  const handleTogglePinned = (packagePath: string, pinned: boolean): void => {
    if (account) {
      nftService.setPinned(account, network, packagePath, pinned);
      bumpRevision();
    }
  };

  return (
    <ManageNftsPage
      collections={(collections.data ?? []).map(collection => ({
        key: collection.packagePath,
        name: collection.name,
        countLabel: `${collection.ownedCount} owned`,
        visible: !preferences.hidden.includes(collection.packagePath),
        pinned: preferences.pinned.includes(collection.packagePath),
      }))}
      onToggleVisible={handleToggleVisible}
      onTogglePinned={handleTogglePinned}
      onBack={navigation.goBack}
    />
  );
};
