import React, { ReactElement } from 'react';
import { TextInput, View } from 'react-native';

import { useAppTheme } from '../../../hooks/use-app-theme';
import { useThemeColors } from '../../../theme';
import { IconButton } from '../../atoms';
import { useStyles } from './chat-composer.styles';

export const CHAT_MAX_LENGTH = 16000;

export interface ChatComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  sending: boolean;
  disabled?: boolean;
  placeholder?: string;
  onSend: () => void;
  onStop: () => void;
}

// Multiline input with a send button that turns into Stop while a reply is streaming.
export const ChatComposer = ({ value, onChangeText, sending, disabled = false, placeholder = 'Ask about your wallet', onSend, onStop }: ChatComposerProps): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();
  const { scheme } = useAppTheme();
  const canSend = !disabled && value.trim().length > 0;

  return (
    <View style={styles.row}>
      <View style={[styles.field, disabled && styles.fieldDisabled]}>
        <TextInput
          testID='chat-input'
          accessibilityLabel='Message'
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.disabled}
          editable={!disabled}
          multiline
          maxLength={CHAT_MAX_LENGTH}
          keyboardAppearance={scheme}
          selectionColor={colors.text.primary}
          style={[styles.input, { color: disabled ? colors.text.disabled : colors.text.primary }]}
        />
      </View>
      {sending
        ? <IconButton icon='stop' accessibilityLabel='Stop' variant='primary' onPress={onStop} testID='chat-stop' />
        : <IconButton icon='arrowUp' accessibilityLabel='Send' variant='primary' disabled={!canSend} onPress={onSend} testID='chat-send' />}
    </View>
  );
};
