import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, StyleSheet, useColorScheme, View } from 'react-native';

import { assets } from '../../../assets';
import { useAppTheme } from '../../../hooks/use-app-theme';
import { themeColors } from '../../../theme';
import { styles } from './splash.styles';

const LAUNCH_FADE_MS = 300;
const LAUNCH_WINDOW_MS = 5000;
const loadedAt = Date.now();
let launchFadeStartedAt: number | null = null;

// The native launch screen follows the OS appearance; when the app theme differs, the splash fades in over it once per cold launch.
// Progress is shared, so a splash remounted mid-fade continues instead of restarting.
const launchFadeProgress = (): number => {
  const now = Date.now();

  if (launchFadeStartedAt === null) {
    if (now - loadedAt > LAUNCH_WINDOW_MS) {
      return 1;
    }

    launchFadeStartedAt = now;
  }

  return Math.min(1, (now - launchFadeStartedAt) / LAUNCH_FADE_MS);
};

export interface SplashPageProps {
  accessibilityLabel?: string;
}

export const SplashPage = ({ accessibilityLabel = 'Adena' }: SplashPageProps): ReactElement => {
  const { scheme } = useAppTheme();
  const launchScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [initialOpacity] = useState(() => (scheme === launchScheme ? 1 : launchFadeProgress()));
  const opacity = useRef(new Animated.Value(initialOpacity)).current;

  useEffect(() => {
    if (initialOpacity >= 1) {
      return;
    }

    let active = true;
    const fade = Animated.timing(opacity, { toValue: 1, duration: (1 - initialOpacity) * LAUNCH_FADE_MS, useNativeDriver: true });

    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active) {
        return;
      }

      if (reduced) {
        opacity.setValue(1);
      }
      else {
        fade.start();
      }
    });

    return (): void => {
      active = false;
      fade.stop();
    };
  }, [initialOpacity, opacity]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors[launchScheme].background.canvas }]} accessible accessibilityRole='image' accessibilityLabel={accessibilityLabel} testID='splash'>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity, backgroundColor: themeColors[scheme].background.canvas }]} testID='splash-background' />
      <Image source={assets.adenaLogo} style={styles.logo} />
    </View>
  );
};
