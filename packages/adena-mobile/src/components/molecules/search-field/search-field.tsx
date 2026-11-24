import React, { ReactElement, useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';

import { colors } from '../../../theme';
import { Icon, IconButton } from '../../atoms';
import { styles } from './search-field.styles';

export interface SearchFieldProps extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText' | 'editable'> {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

export const SearchField = ({ value, onChangeText, placeholder, disabled = false, ...rest }: SearchFieldProps): ReactElement => {
  const [focused, setFocused] = useState(false);
  const muted = disabled ? colors.text.disabled : colors.icon.primary;

  const handleFocus = (): void => setFocused(true);

  const handleBlur = (): void => setFocused(false);

  const handlePress = (): void => onChangeText('');

  return (
    <View style={[styles.field, focused && styles.focused]}>
      <Icon name='search' size={20} color={muted} />
      <TextInput
        {...rest}
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        placeholderTextColor={colors.text.secondary}
        selectionColor={colors.text.primary}
        autoCapitalize='none'
        autoCorrect={false}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[styles.input, { color: disabled ? colors.text.disabled : colors.text.primary }]}
      />
      {value.length > 0 && (
        <IconButton icon='close' accessibilityLabel='Clear' disabled={disabled} onPress={handlePress} />
      )}
    </View>
  );
};
