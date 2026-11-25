import React, { ReactElement, Ref, useState } from 'react';
import { TextInput, TextInputInstance, TextInputProps, View } from 'react-native';

import { useAppTheme } from '../../../hooks/use-app-theme';
import { useThemeColors } from '../../../theme';
import { Icon, IconButton } from '../../atoms';
import { useStyles } from './search-field.styles';

export interface SearchFieldProps extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText' | 'editable'> {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  ref?: Ref<TextInputInstance>;
}

export const SearchField = ({ value, onChangeText, placeholder, disabled = false, ref, ...rest }: SearchFieldProps): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();
  const { scheme } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const muted = disabled ? colors.text.disabled : colors.icon.primary;

  const handleFocus = (): void => setFocused(true);

  const handleBlur = (): void => setFocused(false);

  const handlePress = (): void => onChangeText('');

  return (
    <View style={[styles.field, focused && styles.focused]}>
      <Icon name='search' size={20} color={muted} />
      <TextInput
        returnKeyType='search'
        submitBehavior='blurAndSubmit'
        {...rest}
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        placeholderTextColor={colors.text.secondary}
        keyboardAppearance={scheme}
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
