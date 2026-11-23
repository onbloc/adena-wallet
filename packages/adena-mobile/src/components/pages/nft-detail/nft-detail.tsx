import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Text } from '../../atoms';
import { Card, KeyValueRow, NftImage, Screen, SectionLabel, TopBar } from '../../molecules';
import { styles } from './nft-detail.styles';

export interface NftDetailPageProps {
  name: string;
  collectionName: string;
  imageUri?: string | null;
  imageLoading: boolean;
  description?: string;
  rows: { label: string; value: string }[];
  traits: { label: string; value: string }[];
  onSend?: () => void;
  onBack: () => void;
}

export const NftDetailPage = ({ name, collectionName, imageUri, imageLoading, description, rows, traits, onSend, onBack }: NftDetailPageProps): ReactElement => (
  <Screen header={<TopBar title='NFT details' onBack={onBack} />} footer={onSend && <Button label='Send' onPress={onSend} />}>
    <View style={styles.image}>
      <NftImage uri={imageUri} loading={imageLoading} size='70%' />
    </View>
    <View style={styles.names}>
      <Text variant='title'>{name}</Text>
      <Text variant='meta' color='secondary'>{collectionName}</Text>
    </View>
    {description && <Text variant='body' color='secondary'>{description}</Text>}
    <Card>
      {rows.map(row => <KeyValueRow key={row.label} label={row.label} value={row.value} />)}
    </Card>
    {traits.length > 0 && (
      <>
        <SectionLabel label='Traits' />
        <View style={styles.traits}>
          {traits.map(trait => (
            <View key={`${trait.label}:${trait.value}`} style={styles.trait}>
              <Text variant='meta' color='secondary'>{trait.label}</Text>
              <Text variant='row'>{trait.value}</Text>
            </View>
          ))}
        </View>
      </>
    )}
  </Screen>
);
