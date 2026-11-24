import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { StatusTone, ThemeColors, useThemeColors } from '../../../theme';
import { Icon, IconName, Text, TextColor } from '../../atoms';
import { useStyles } from './inline-alert.styles';

const tones = (colors: ThemeColors): Record<StatusTone, { icon: IconName; color: string; text: TextColor }> => ({
  neutral: { icon: 'info', color: colors.icon.secondary, text: 'primary' },
  info: { icon: 'info', color: colors.icon.primary, text: 'primary' },
  success: { icon: 'success', color: colors.status.success, text: 'success' },
  warning: { icon: 'warning', color: colors.status.warning, text: 'warning' },
  error: { icon: 'error', color: colors.status.error, text: 'error' },
});

export interface InlineAlertProps {
  title: string;
  description?: string;
  tone?: StatusTone;
}

// Persistent context placed beside the affected content.
export const InlineAlert = ({ title, description, tone = 'info' }: InlineAlertProps): ReactElement => {
  const styles = useStyles();
  const style = tones(useThemeColors())[tone];

  return (
    <View accessibilityRole='alert' style={styles.box}>
      <Icon name={style.icon} size={20} color={style.color} />
      <View style={styles.texts}>
        <Text variant='row' color={style.text}>{title}</Text>
        {description && <Text variant='meta' color='secondary'>{description}</Text>}
      </View>
    </View>
  );
};
