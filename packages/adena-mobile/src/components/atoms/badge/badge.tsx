import { ReactElement } from 'react';
import { View } from 'react-native';

import { StatusTone, ThemeColors, useThemeColors } from '../../../theme';
import { Text } from '../text';
import { useStyles } from './badge.styles';

const toneColor = (colors: ThemeColors): Record<StatusTone, string> => ({
  neutral: colors.text.secondary,
  info: colors.text.primary,
  success: colors.status.success,
  warning: colors.status.warning,
  error: colors.status.error,
});

// Status is a word, a mark and a color together.
export const Badge = ({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: StatusTone;
}): ReactElement => {
  const styles = useStyles();
  const color = toneColor(useThemeColors())[tone];

  return (
    <View style={styles.base}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant='tab' style={{ color }}>
        {label}
      </Text>
    </View>
  );
};
