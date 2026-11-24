import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { StatusTone, ThemeColors, useThemeColors } from '../../../theme';
import { Icon, IconButton, IconName, Text, TextColor } from '../../atoms';
import { useStyles } from './toast.styles';

const tones = (colors: ThemeColors): Record<StatusTone, { icon: IconName; color: string; text: TextColor }> => ({
  neutral: { icon: 'info', color: colors.icon.secondary, text: 'primary' },
  info: { icon: 'info', color: colors.icon.primary, text: 'primary' },
  success: { icon: 'check', color: colors.status.success, text: 'success' },
  warning: { icon: 'info', color: colors.status.warning, text: 'warning' },
  error: { icon: 'close', color: colors.status.error, text: 'error' },
});

export interface ToastProps {
  message: string;
  tone?: StatusTone;
  onDismiss?: () => void;
}

export const Toast = ({ message, tone = 'info', onDismiss }: ToastProps): ReactElement => {
  const styles = useStyles();
  const style = tones(useThemeColors())[tone];

  return (
    <View accessibilityRole='alert' accessibilityLiveRegion='polite' style={styles.toast}>
      <Icon name={style.icon} size={20} color={style.color} />
      <Text variant='meta' color={style.text} style={styles.message}>{message}</Text>
      {onDismiss && <IconButton icon='close' accessibilityLabel='Dismiss' size={36} onPress={onDismiss} />}
    </View>
  );
};
