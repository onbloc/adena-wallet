import React, { ReactElement } from 'react';
import { Pressable, PressableStateCallbackType, StyleProp, View, ViewStyle } from 'react-native';

import { useThemeColors } from '../../../theme';
import { Icon, Text } from '../../atoms';
import { useStyles } from './select-field.styles';

export interface SelectFieldProps {
  label: string;
  value?: string;
  placeholder: string;
  onPress?: () => void;
  disabled?: boolean;
}

export const SelectField = ({ label, value, placeholder, onPress, disabled = false }: SelectFieldProps): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();

  const stylePressable = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [
    styles.field,
    { borderColor: pressed ? colors.border.focus : colors.border.input, borderWidth: pressed ? 1.5 : 1 },
    disabled && styles.disabled,
  ];

  return (
    <View style={styles.container}>
      <Text variant='meta' color={disabled ? 'disabled' : 'secondary'}>{label}</Text>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={`${label}: ${value ?? placeholder}`}
        disabled={disabled}
        onPress={onPress}
        style={stylePressable}
      >
        <Text variant='body' color={disabled ? 'disabled' : value ? 'primary' : 'disabled'} numberOfLines={1} style={styles.value}>
          {value ?? placeholder}
        </Text>
        <Icon name='chevronDown' size={20} color={disabled ? colors.text.disabled : colors.icon.primary} />
      </Pressable>
    </View>
  );
};
