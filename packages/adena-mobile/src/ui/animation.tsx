import LottieView, {type AnimationObject} from 'lottie-react-native';
import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';

/** Plays one of the extension's Lottie files (@assets/web/lottie/*.json). */
export function Animation({
  source,
  loop = true,
  style,
}: {
  source: AnimationObject;
  loop?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    // Decorative only: screen readers skip it.
    <View
      style={style}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <LottieView source={source} autoPlay loop={loop} style={styles.fill} />
    </View>
  );
}

const styles = StyleSheet.create({fill: {flex: 1}});
