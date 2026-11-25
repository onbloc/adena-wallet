import React, { ReactElement } from 'react';
import { Pressable, View } from 'react-native';

import { useThemeColors } from '../../../theme';
import { Icon } from '../icon';
import { Text } from '../text';
import { styles } from './checkbox.styles';

export type CheckboxValue = 'off' | 'on' | 'mixed';

export interface CheckboxProps {
  label: string;
  value: CheckboxValue;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
}

export const Checkbox = ({ label, value, onChange, disabled = false }: CheckboxProps): ReactElement => {
  const colors = useThemeColors();
  const filled = value !== 'off';
  const fill = disabled ? colors.action.disabled : colors.action.primary;

  const handlePress = (): void | undefined => onChange?.(value !== 'on');

  return (
    <Pressable
      accessibilityRole='checkbox'
      accessibilityState={{ checked: value === 'mixed' ? 'mixed' : value === 'on', disabled }}
      disabled={disabled}
      onPress={handlePress}
      style={styles.row}
    >
      <View
        style={[
          styles.box,
          filled ? { backgroundColor: fill, borderColor: fill } : { borderColor: disabled ? colors.border.subtle : colors.border.input },
        ]}
      >
        {value === 'on' && <Icon name='check' size={14} color={disabled ? colors.text.disabled : colors.text.inverse} />}
        {value === 'mixed' && <View style={[styles.dash, { backgroundColor: disabled ? colors.text.disabled : colors.text.inverse }]} />}
      </View>
      <Text variant='body' color={disabled ? 'disabled' : 'primary'} style={styles.label}>{label}</Text>
    </Pressable>
  );
};
