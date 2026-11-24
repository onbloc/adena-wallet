import React, { ReactElement, useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';

import { HapticKind } from '../../../domain/haptics';
import { useHaptics } from '../../../hooks/use-haptics';
import { colors, motion } from '../../../theme';
import { OFFSET, styles, THUMB, TRACK_WIDTH } from './switch.styles';

export interface SwitchProps {
  value: boolean;
  onValueChange?: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
}

export const Switch = ({ value, onValueChange, disabled = false, accessibilityLabel }: SwitchProps): ReactElement => {
  const position = useRef(new Animated.Value(value ? 1 : 0)).current;
  const playHaptic = useHaptics();

  useEffect(() => {
    Animated.timing(position, { toValue: value ? 1 : 0, duration: motion.press, useNativeDriver: true }).start();
  }, [position, value]);

  const translateX = position.interpolate({ inputRange: [0, 1], outputRange: [0, TRACK_WIDTH - THUMB - OFFSET * 2] });
  const trackColor = disabled ? colors.action.disabled : value ? colors.action.primary : colors.action.secondary;
  const thumbColor = disabled ? colors.text.secondary : colors.background.surface;

  const handlePress = (): void => {
    playHaptic(HapticKind.SELECTION);
    onValueChange?.(!value);
  };

  return (
    <Pressable
      accessibilityRole='switch'
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={handlePress}
      style={[styles.track, { backgroundColor: trackColor }]}
    >
      <Animated.View style={[styles.thumb, { backgroundColor: thumbColor, transform: [{ translateX }] }]} />
    </Pressable>
  );
};
