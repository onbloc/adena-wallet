import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Text } from '../../atoms';
import { KeyValueRow, ListRow, NftImage, Screen, SectionLabel, TopBar } from '../../molecules';
import { styles } from './nft-detail.styles';

export interface NftDetailPageProps {
  name: string;
  collectionName: string;
  // Secondary line of the collection row, e.g. the realm path.
  collectionDescription?: string;
  imageUri?: string | null;
  imageLoading: boolean;
  description?: string;
  rows: { label: string; value: string }[];
  traits: { label: string; value: string }[];
  onOpenCollection?: () => void;
  onSend?: () => void;
  onBack: () => void;
}

// Traits can repeat, so each key carries its occurrence count.
const traitKeys = <T extends { label: string; value: string }>(traits: T[]): { key: string; trait: T }[] => {
  const seen = new Map<string, number>();

  return traits.map((trait) => {
    const base = `${trait.label}:${trait.value}`;
    const count = seen.get(base) ?? 0;

    seen.set(base, count + 1);
    return { key: `${base}:${count}`, trait };
  });
};

export const NftDetailPage = ({
  name,
  collectionName,
  collectionDescription,
  imageUri,
  imageLoading,
  description,
  rows,
  traits,
  onOpenCollection,
  onSend,
  onBack,
}: NftDetailPageProps): ReactElement => (
  <Screen header={<TopBar title='NFT details' variant='root' onBack={onBack} />} footer={onSend && <Button label='Send' onPress={onSend} />}>
    <View style={styles.image}>
      <NftImage uri={imageUri} loading={imageLoading} size='70%' />
    </View>
    <View style={styles.names}>
      <Text variant='title'>{name}</Text>
      <Text variant='meta' color='secondary'>{collectionName}</Text>
    </View>
    {onOpenCollection && <ListRow label={collectionName} description={collectionDescription} onPress={onOpenCollection} />}
    {description && <Text variant='body'>{description}</Text>}
    {rows.length > 0 && (
      <View>
        {rows.map(row => <KeyValueRow key={row.label} label={row.label} value={row.value} emphasis />)}
      </View>
    )}
    {traits.length > 0 && (
      <>
        <SectionLabel label='Traits' />
        <View style={styles.traits}>
          {traitKeys(traits).map(({ key, trait }) => (
            <View key={key} style={styles.trait}>
              <Text variant='meta' color='secondary'>{trait.label}</Text>
              <Text variant='row'>{trait.value}</Text>
            </View>
          ))}
        </View>
      </>
    )}
  </Screen>
);
