import React, { ReactElement, useState } from 'react';
import { TextInput, TextInputBlurEvent, TextInputFocusEvent, TextInputProps, View } from 'react-native';

import { colors } from '../../../theme';
import { Icon, IconButton, IconName, Text } from '../../atoms';
import { styles } from './text-field.styles';

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'editable'> {
  label: string;
  helper?: string;
  error?: string;
  disabled?: boolean;
  leadingIcon?: IconName;
  secure?: boolean;
  multiline?: boolean;
}

export const TextField = ({
  label,
  helper,
  error,
  disabled = false,
  leadingIcon,
  secure = false,
  multiline = false,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps): ReactElement => {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const borderColor = error ? colors.status.error : focused ? colors.border.focus : colors.border.input;

  const handleFocus = (event: TextInputFocusEvent): void => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: TextInputBlurEvent): void => {
    setFocused(false);
    onBlur?.(event);
  };

  const handlePress = (): void => setRevealed(value => !value);

  return (
    <View style={styles.container}>
      <Text variant='meta' color={disabled ? 'disabled' : 'secondary'}>{label}</Text>
      <View
        style={[
          styles.field,
          multiline && styles.multiline,
          { borderColor, borderWidth: focused || error ? 1.5 : 1 },
          disabled && styles.disabled,
        ]}
      >
        {leadingIcon && <Icon name={leadingIcon} size={20} color={colors.icon.secondary} />}
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          editable={!disabled}
          multiline={multiline}
          secureTextEntry={secure && !revealed}
          placeholderTextColor={colors.text.disabled}
          selectionColor={colors.text.primary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[styles.input, multiline && styles.multilineInput, { color: disabled ? colors.text.disabled : colors.text.primary }]}
        />
        {secure && (
          <IconButton
            icon={revealed ? 'eyeOff' : 'eye'}
            accessibilityLabel={revealed ? 'Hide' : 'Show'}
            size={36}
            onPress={handlePress}
          />
        )}
      </View>
      {(error || helper) && (
        <Text variant='meta' color={error ? 'error' : disabled ? 'disabled' : 'secondary'}>{error ?? helper}</Text>
      )}
    </View>
  );
};
