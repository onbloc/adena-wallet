import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { IconButton, Text } from '../../atoms';
import { styles } from './key-value-row.styles';

export interface KeyValueRowProps {
  label: string;
  value: string;
  emphasis?: boolean;
  multiline?: boolean;
  // Copies the full value when the displayed one is truncated.
  onCopy?: () => void;
  copyLabel?: string;
}

export const KeyValueRow = ({ label, value, emphasis = false, multiline = false, onCopy, copyLabel }: KeyValueRowProps): ReactElement => (
  <View style={[styles.row, multiline && styles.stacked, onCopy && styles.centered]}>
    <Text variant='meta' color='secondary'>{label}</Text>
    <View style={[styles.valueGroup, multiline ? styles.valueGroupStacked : styles.value]}>
      <Text
        variant={emphasis ? 'row' : 'meta'}
        tabular
        selectable
        align={multiline ? 'left' : 'right'}
        style={styles.value}
      >
        {value}
      </Text>
      {onCopy && <IconButton icon='copy' accessibilityLabel={copyLabel ?? `Copy ${label.toLowerCase()}`} size={32} onPress={onCopy} />}
    </View>
  </View>
);
