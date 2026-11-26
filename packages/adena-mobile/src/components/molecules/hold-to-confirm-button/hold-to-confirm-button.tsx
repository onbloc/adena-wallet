import React, { ReactElement, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';

import { HapticKind } from '../../../domain/haptics';
import { useHaptics } from '../../../hooks/use-haptics';
import { useThemeColors } from '../../../theme';
import { Icon, Spinner, Text } from '../../atoms';
import { useStyles } from './hold-to-confirm-button.styles';

export const HOLD_TO_CONFIRM_MS = 1200;

export interface HoldToConfirmButtonProps {
  label: string;
  loadingLabel?: string;
  tone?: 'primary' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  testID?: string;
}

// Confirms only after a continuous hold, so a stray tap cannot approve.
export const HoldToConfirmButton = ({
  label,
  loadingLabel = 'Submitting…',
  tone = 'primary',
  loading = false,
  disabled = false,
  onConfirm,
  testID,
}: HoldToConfirmButtonProps): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();
  const playHaptic = useHaptics();
  const progress = useRef(new Animated.Value(0)).current;
  const inactive = disabled || loading;
  const background = inactive ? colors.action.disabled : tone === 'destructive' ? colors.status.error : colors.action.primary;
  const foreground = inactive ? colors.text.disabled : colors.text.inverse;

  useEffect(() => {
    if (inactive) {
      progress.stopAnimation();
      progress.setValue(0);
    }
  }, [inactive, progress]);

  const handlePressIn = (): void => {
    playHaptic(HapticKind.SELECTION);
    Animated.timing(progress, { toValue: 1, duration: HOLD_TO_CONFIRM_MS, easing: Easing.linear, useNativeDriver: false }).start();
  };

  const handlePressOut = (): void => {
    progress.stopAnimation();
    Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: false }).start();
  };

  const handleLongPress = (): void => {
    playHaptic(HapticKind.IMPACT);
    onConfirm();
  };

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityHint='Press and hold to confirm'
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      delayLongPress={HOLD_TO_CONFIRM_MS}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={handleLongPress}
      style={[styles.base, { backgroundColor: background }]}
      testID={testID}
    >
      <Animated.View style={[styles.fill, { width, backgroundColor: colors.text.inverse }]} />
      <View style={styles.label}>
        {loading ? <Spinner size={18} tone='inverse' /> : <Icon name='target' size={20} color={foreground} />}
        <Text variant='button' style={{ color: foreground }}>{loading ? loadingLabel : label}</Text>
      </View>
    </Pressable>
  );
};
