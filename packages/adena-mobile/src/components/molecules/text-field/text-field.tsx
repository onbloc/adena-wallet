import React, { ReactElement, Ref, useState } from 'react';
import { Platform, TextInput, TextInputBlurEvent, TextInputFocusEvent, TextInputInstance, TextInputProps, View } from 'react-native';

import { useAppTheme } from '../../../hooks/use-app-theme';
import { useThemeColors } from '../../../theme';
import { Icon, IconButton, IconName, Text } from '../../atoms';
import { useSheetKeyboardHandle } from '../bottom-sheet/sheet-keyboard';
import { useStyles } from './text-field.styles';

// Keeps secrets out of iOS Passwords / Google Password Manager and keyboard learning. Applied after the
// caller's props, so a secret field can never be turned back into an autofill target.
export const SECRET_INPUT_PROPS = {
  textContentType: 'none',
  autoComplete: 'off',
  importantForAutofill: 'noExcludeDescendants',
  autoCorrect: false,
  spellCheck: false,
  autoCapitalize: 'none',
} as const satisfies Partial<TextInputProps>;

// `secure` is the only masking API; the native `secureTextEntry` is not accepted so it cannot be overridden silently.
export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'editable' | 'secureTextEntry'> {
  label: string;
  helper?: string;
  error?: string;
  disabled?: boolean;
  leadingIcon?: IconName;
  secure?: boolean;
  // A secret shown in plain text (recovery phrase, private key): no autofill, saving or learning.
  sensitive?: boolean;
  multiline?: boolean;
  // Lets a form move focus to this field, e.g. from the previous field's return key.
  ref?: Ref<TextInputInstance>;
}

export const TextField = ({
  label,
  helper,
  error,
  disabled = false,
  leadingIcon,
  secure = false,
  sensitive = false,
  multiline = false,
  onFocus,
  onBlur,
  ref,
  ...inputProps
}: TextFieldProps): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();
  const { scheme } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const sheetKeyboard = useSheetKeyboardHandle();
  const [revealed, setRevealed] = useState(false);
  const borderColor = error ? colors.status.error : focused ? colors.border.focus : colors.border.input;

  const handleFocus = (event: TextInputFocusEvent): void => {
    setFocused(true);
    sheetKeyboard?.onInputFocus();
    onFocus?.(event);
  };

  const handleBlur = (event: TextInputBlurEvent): void => {
    setFocused(false);
    sheetKeyboard?.onInputBlur();
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
          {...((secure || sensitive) && SECRET_INPUT_PROPS)}
          // Android keyboards do not learn or suggest from a visible-password field; never with masking.
          {...(sensitive && !secure && Platform.OS === 'android' && { keyboardType: 'visible-password' as const })}
          ref={ref}
          accessibilityLabel={label}
          editable={!disabled}
          multiline={multiline}
          secureTextEntry={secure && !revealed}
          placeholderTextColor={colors.text.disabled}
          keyboardAppearance={scheme}
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
