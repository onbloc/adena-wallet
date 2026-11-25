import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { IconButton, Switch, Text } from '../../atoms';
import { EmptyState, Screen, TopBar } from '../../molecules';
import { useStyles } from './manage-nfts.styles';

export interface ManagedCollectionView {
  key: string;
  name: string;
  countLabel: string;
  visible: boolean;
  pinned: boolean;
}

export interface ManageNftsPageProps {
  collections: ManagedCollectionView[];
  onToggleVisible: (key: string, visible: boolean) => void;
  onTogglePinned: (key: string, pinned: boolean) => void;
  onBack: () => void;
}

export const ManageNftsPage = ({ collections, onToggleVisible, onTogglePinned, onBack }: ManageNftsPageProps): ReactElement => {
  const styles = useStyles();

  return (
    <Screen header={<TopBar title='Manage NFTs' onBack={onBack} />}>
      <Text variant='meta' color='secondary'>Pinned collections are shown first. Hidden collections stay in your wallet.</Text>
      {collections.length === 0 && <EmptyState title='No collectibles yet' />}
      {collections.map((collection) => {
        const handlePress = (): void => onTogglePinned(collection.key, !collection.pinned);

        const handleValueChange = (value: boolean): void => onToggleVisible(collection.key, value);

        return (
          <View key={collection.key} style={styles.row}>
            <IconButton
              icon={collection.pinned ? 'check' : 'plus'}
              variant={collection.pinned ? 'primary' : 'surface'}
              size={32}
              accessibilityLabel={collection.pinned ? `Unpin ${collection.name}` : `Pin ${collection.name}`}
              onPress={handlePress}
            />
            <View style={styles.texts}>
              <Text variant='row' numberOfLines={1}>{collection.name}</Text>
              <Text variant='meta' color='secondary'>{collection.countLabel}</Text>
            </View>
            <Switch value={collection.visible} accessibilityLabel={`Show ${collection.name}`} onValueChange={handleValueChange} />
          </View>
        );
      })}
    </Screen>
  );
};
