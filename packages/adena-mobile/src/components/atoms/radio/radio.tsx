import React, { ReactElement } from 'react';
import { Pressable, View } from 'react-native';

import { useThemeColors } from '../../../theme';
import { Text } from '../text';
import { styles } from './radio.styles';

export interface RadioProps {
  label: string;
  selected: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}

export const Radio = ({ label, selected, onSelect, disabled = false }: RadioProps): ReactElement => {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole='radio'
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onSelect}
      style={styles.row}
    >
      <View style={[styles.outer, { borderColor: disabled ? colors.border.subtle : selected ? colors.action.primary : colors.border.input }]}>
        {selected && <View style={[styles.inner, { backgroundColor: disabled ? colors.text.disabled : colors.action.primary }]} />}
      </View>
      <Text variant='body' color={disabled ? 'disabled' : 'primary'} style={styles.label}>{label}</Text>
    </Pressable>
  );
};
