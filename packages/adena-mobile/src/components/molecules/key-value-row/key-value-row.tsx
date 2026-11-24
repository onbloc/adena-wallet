import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Text } from '../../atoms';
import { styles } from './key-value-row.styles';

export interface KeyValueRowProps {
  label: string;
  value: string;
  emphasis?: boolean;
  multiline?: boolean;
}

export const KeyValueRow = ({ label, value, emphasis = false, multiline = false }: KeyValueRowProps): ReactElement => (
  <View style={[styles.row, multiline && styles.stacked]}>
    <Text variant='meta' color='secondary'>{label}</Text>
    <Text
      variant={emphasis ? 'row' : 'meta'}
      tabular
      selectable
      align={multiline ? 'left' : 'right'}
      style={!multiline && styles.value}
    >
      {value}
    </Text>
  </View>
);
