import type {TokenModel} from '@types';
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {colors, colorTokens, fonts, radius} from './theme';
import {TokenLogo} from './token-logo';

/** One token line: logo, name (and symbol), and whatever goes on the right. */
export function TokenRow({
  token,
  right,
  detail,
  onPress,
  testID,
}: {
  token: TokenModel;
  right?: React.ReactNode;
  detail?: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({pressed}) => [styles.row, pressed && styles.pressed]}>
      <TokenLogo token={token} />
      <View style={styles.names}>
        <Text style={styles.name} numberOfLines={1}>
          {token.name}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {detail ?? token.symbol}
        </Text>
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: radius.md,
    backgroundColor: colorTokens.neutral._9,
  },
  pressed: {opacity: 0.85},
  names: {flex: 1},
  name: {...fonts.body2Bold, color: colors.text},
  detail: {...fonts.captionReg, color: colors.textMuted},
});
