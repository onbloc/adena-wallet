import React, { ReactElement, useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

import { colors } from '../../../theme';
import { Icon } from '../icon';

export type SpinnerTone = 'primary' | 'inverse' | 'muted';

const TONE_COLOR: Record<SpinnerTone, string> = {
  primary: colors.icon.primary,
  inverse: colors.text.inverse,
  muted: colors.text.disabled,
};

export const Spinner = ({ tone = 'primary', size = 20 }: { tone?: SpinnerTone; size?: number }): ReactElement => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced || !active) {
        return;
      }

      loop = Animated.loop(
        Animated.timing(rotation, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }),
      );
      loop.start();
    });
    return (): void => {
      active = false;
      loop?.stop();
    };
  }, [rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View accessibilityRole='progressbar' style={{ transform: [{ rotate }] }}>
      <Icon name='loader' size={size} color={TONE_COLOR[tone]} />
    </Animated.View>
  );
};
