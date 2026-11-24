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
  // Only the USD value is pending; a fixed-size placeholder keeps the row from shifting.
  valueLoading?: boolean;
  onPress?: () => void;
}

export const VALUE_SKELETON = { width: 72, height: 16 };

// Right-aligned values with full precision; a skeleton until the balance is known.
export const AssetRow = ({ name, quantity, value, change, icon, loading = false, valueLoading = false, onPress }: AssetRowProps): ReactElement => {
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
        {loading || valueLoading
          ? <Skeleton width={loading ? 88 : VALUE_SKELETON.width} height={VALUE_SKELETON.height} />
          : value && <Text variant='row' tabular align='right'>{value}</Text>}
        {!loading && !valueLoading && change && (
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

// Same frame as a loaded row so the list keeps its height when the data arrives.
export const AssetRowSkeleton = (): ReactElement => (
  <View style={[styles.row, styles.skeleton]}>
    <Skeleton width={32} height={32} rounded />
    <View style={styles.name}>
      <Skeleton width={96} height={16} />
      <Skeleton width={72} height={14} />
    </View>
    <View style={styles.values}>
      <Skeleton width={VALUE_SKELETON.width} height={VALUE_SKELETON.height} />
    </View>
  </View>
);
