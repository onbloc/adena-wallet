import React, { ReactElement } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '../../atoms';
import { NftImage } from '../nft-image';
import { styles } from './nft-card.styles';

export interface NftCardProps {
  title: string;
  subtitle?: string;
  imageUri?: string | null;
  imageLoading?: boolean;
  onPress?: () => void;
}

export const NftCard = ({ title, subtitle, imageUri, imageLoading, onPress }: NftCardProps): ReactElement => (
  <Pressable accessibilityRole='button' accessibilityLabel={title} onPress={onPress} style={styles.card}>
    <NftImage uri={imageUri} loading={imageLoading} />
    <View style={styles.texts}>
      <Text variant='row' numberOfLines={1}>{title}</Text>
      {subtitle && <Text variant='meta' color='secondary' numberOfLines={1}>{subtitle}</Text>}
    </View>
  </Pressable>
);
