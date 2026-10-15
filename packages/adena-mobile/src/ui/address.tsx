import React from 'react';
import {StyleSheet, Text} from 'react-native';

import {addressParts} from '../core/format';
import {colors, monoFont} from './theme';

/**
 * Full address with its first and last six characters in bold. Address
 * poisoning relies on look-alikes that share only the ends people glance at,
 * so the whole address is always shown.
 */
export function Address({value}: {value: string}) {
  const {head, middle, tail} = addressParts(value);
  return (
    <Text selectable style={styles.text}>
      <Text style={styles.strong}>{head}</Text>
      {middle}
      <Text style={styles.strong}>{tail}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {...monoFont, fontSize: 14, lineHeight: 21, color: colors.textMuted},
  strong: {color: colors.text, fontWeight: '700'},
});
