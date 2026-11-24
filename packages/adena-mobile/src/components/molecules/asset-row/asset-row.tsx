import React, { ReactElement, ReactNode } from 'react';
import { Pressable, PressableStateCallbackType, View } from 'react-native';

import { colors } from '../../../theme';
import { Skeleton, Text } from '../../atoms';
import { Trend } from '../../view-models';
import { styles } from './asset-row.styles';

export interface AssetRowProps {
  name: string;
  quantity?: string;
  value?: string;
  change?: { label: string; trend: Trend };
  icon: ReactNode;
  loading?: boolean;
  onPress?: () => void;
}

// Right-aligned values with full precision; a skeleton until the balance is known.
export const AssetRow = ({ name, quantity, value, change, icon, loading = false, onPress }: AssetRowProps): ReactElement => {
  const stylePressable = ({ pressed }: PressableStateCallbackType): ({ minHeight: 60; borderRadius: 12; paddingHorizontal: 12; paddingVertical: 8; flexDirection: 'row'; alignItems: 'center'; gap: 12 } | { backgroundColor: '#F7F8F9' | '#F1F3F4' })[] => [styles.row, { backgroundColor: pressed ? colors.background.pressed : colors.background.subtle }];

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={stylePressable}
    >
      {icon}
      <View style={styles.name}>
        <Text variant='row' numberOfLines={1}>{name}</Text>
        {loading ? <Skeleton width={72} height={14} /> : quantity && <Text variant='meta' color='secondary' tabular numberOfLines={1}>{quantity}</Text>}
      </View>
      <View style={styles.values}>
        {loading
          ? <Skeleton width={88} height={16} />
          : value && <Text variant='row' tabular align='right'>{value}</Text>}
        {!loading && change && (
          <Text
            variant='meta'
            tabular
            align='right'
            color={change.trend === Trend.POSITIVE ? 'success' : change.trend === Trend.NEGATIVE ? 'error' : 'secondary'}
          >
            {change.label}
          </Text>
        )}
      </View>
    </Pressable>
  );
};
