import { ReactElement } from 'react';
import { View } from 'react-native';

import { colors, StatusTone } from '../../../theme';
import { Text } from '../text';
import { styles } from './badge.styles';

const TONE_COLOR: Record<StatusTone, string> = {
  neutral: colors.text.secondary,
  info: colors.text.primary,
  success: colors.status.success,
  warning: colors.status.warning,
  error: colors.status.error,
};

// Status is a word, a mark and a color together.
export const Badge = ({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: StatusTone;
}): ReactElement => (
  <View style={styles.base}>
    <View style={[styles.dot, { backgroundColor: TONE_COLOR[tone] }]} />
    <Text variant='tab' style={{ color: TONE_COLOR[tone] }}>
      {label}
    </Text>
  </View>
);
