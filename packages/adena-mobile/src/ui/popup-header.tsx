import LeftArrowIcon from '@assets/arrowL-left.svg';
import type {NativeStackHeaderProps} from '@react-navigation/native-stack';
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {colors, fonts} from './theme';

/**
 * The popup's sub-header (components/atoms/sub-header): a plain back arrow,
 * the centred title and an optional right icon. Drawn here instead of the
 * system bar, whose iOS 26 glass capsules around the buttons clash with the
 * dark design, and so Android looks the same.
 */
export function PopupHeader({
  navigation,
  route,
  options,
  back,
}: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const title =
    typeof options.headerTitle === 'string'
      ? options.headerTitle
      : options.title ?? route.name;
  const showBack = !!back && options.headerBackVisible !== false;
  const right = options.headerRight?.({
    tintColor: colors.text,
    canGoBack: !!back,
  });

  return (
    <View style={[styles.bar, {paddingTop: insets.top}]}>
      <View style={styles.row}>
        <View style={styles.side}>
          {showBack && (
            <Pressable
              testID="header-back"
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={12}
              onPress={() => navigation.goBack()}
              style={({pressed}) => pressed && styles.pressed}>
              <LeftArrowIcon width={24} height={24} />
            </Pressable>
          )}
        </View>
        <Text accessibilityRole="header" style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {backgroundColor: colors.background},
  row: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  side: {width: 40, alignItems: 'flex-start'},
  sideRight: {alignItems: 'flex-end'},
  // Same face and size as the system title it replaces.
  title: {
    fontFamily: fonts.header5.fontFamily,
    fontSize: 20,
    lineHeight: 26,
    flex: 1,
    color: colors.text,
    textAlign: 'center',
  },
  pressed: {opacity: 0.6},
});
