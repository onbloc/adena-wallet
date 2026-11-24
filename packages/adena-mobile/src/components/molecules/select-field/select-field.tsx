import React, { ReactElement } from 'react';
import { Pressable, PressableStateCallbackType, View } from 'react-native';

import { colors } from '../../../theme';
import { Icon, Text } from '../../atoms';
import { styles } from './select-field.styles';

export interface SelectFieldProps {
  label: string;
  value?: string;
  placeholder: string;
  onPress?: () => void;
  disabled?: boolean;
}

export const SelectField = ({ label, value, placeholder, onPress, disabled = false }: SelectFieldProps): ReactElement => {
  const stylePressable = ({ pressed }: PressableStateCallbackType): (false | { minHeight: 52; borderRadius: 12; paddingHorizontal: 12; flexDirection: 'row'; alignItems: 'center'; backgroundColor: '#FFFFFF' } | { backgroundColor: '#E6E6E6'; borderColor: '#E6E6E6' } | { borderColor: '#858585' | '#121212'; borderWidth: number })[] => [
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
