import React, { ReactElement, useEffect, useRef } from 'react';
import { Animated, DimensionValue } from 'react-native';

import { radius } from '../../../theme';
import { styles } from './skeleton.styles';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  rounded?: boolean;
}

// Shown before a value is known; never use it for an actual zero.
export const Skeleton = ({ width = '100%', height = 16, rounded = false }: SkeletonProps): ReactElement => {
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.6, duration: 600, useNativeDriver: true }),
    ]));

    pulse.start();
    return (): void => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityLabel='Loading'
      style={[styles.base, { width, height, opacity, borderRadius: rounded ? radius.circle : radius.smallControl }]}
    />
  );
};
