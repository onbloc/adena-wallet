import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Skeleton, Text, TextColor } from '../../atoms';
import { styles } from './balance-header.styles';

export interface BalanceHeaderProps {
  value?: string;
  caption?: string;
  captionColor?: TextColor;
  loading?: boolean;
}

// Large value establishes hierarchy; numbers lead, actions follow.
export const BalanceHeader = ({ value, caption, captionColor = 'secondary', loading = false }: BalanceHeaderProps): ReactElement => (
  <View style={styles.container}>
    {loading || value === undefined
      ? <Skeleton width={200} height={44} />
      : <Text variant='display' tabular adjustsFontSizeToFit numberOfLines={1}>{value}</Text>}
    {caption && <Text variant='meta' color={captionColor} tabular>{caption}</Text>}
  </View>
);
