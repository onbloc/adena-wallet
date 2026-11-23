import React, { ReactElement } from 'react';
import { Pressable, PressableStateCallbackType, View } from 'react-native';

import { colors } from '../../../theme';
import { Icon, IconName, Text, TextColor } from '../../atoms';
import { AmountTone } from '../../view-models';
import { styles } from './activity-row.styles';

export interface ActivityRowProps {
  title: string;
  description?: string;
  amountLabel?: string;
  tone: AmountTone;
  failed: boolean;
  extraInfo?: string;
  icon: IconName;
  onPress?: () => void;
}

const AMOUNT_COLOR: Record<ActivityRowProps['tone'], TextColor> = { positive: 'success', default: 'primary', muted: 'disabled' };

// Status is a word, an icon and a color: failed rows carry all three.
export const ActivityRow = ({ title, description, amountLabel, tone, failed, extraInfo, icon, onPress }: ActivityRowProps): ReactElement => {
  const stylePressable = ({ pressed }: PressableStateCallbackType): ({ minHeight: 60; borderRadius: 12; paddingHorizontal: 12; paddingVertical: 8; flexDirection: 'row'; alignItems: 'center'; gap: 12 } | { backgroundColor: '#F7F8F9' | '#F1F3F4' })[] => [styles.row, { backgroundColor: pressed ? colors.background.pressed : colors.background.subtle }];

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={[title, description, amountLabel, failed ? 'Failed' : undefined].filter(Boolean).join(', ')}
      onPress={onPress}
      style={stylePressable}
    >
      <View style={styles.icon}>
        <Icon name={failed ? 'error' : icon} size={20} color={failed ? colors.status.error : colors.icon.primary} />
      </View>
      <View style={styles.texts}>
        <Text variant='row' numberOfLines={1}>{extraInfo ? `${title} ${extraInfo}` : title}</Text>
        <Text variant='meta' color={failed ? 'error' : 'secondary'} numberOfLines={1}>{failed ? 'Failed' : description}</Text>
      </View>
      {amountLabel && <Text variant='row' tabular color={AMOUNT_COLOR[tone]} numberOfLines={1} style={styles.amount}>{amountLabel}</Text>}
    </Pressable>
  );
};
