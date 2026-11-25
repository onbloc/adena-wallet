import React, { ReactElement, useRef } from 'react';
import { TextInputInstance } from 'react-native';

import { Button, Text, TextColor } from '../../atoms';
import { Screen, TextField, TopBar } from '../../molecules';
import { styles } from './create-password.styles';

// Shown once the password passes the strength rule, like the extension's Medium / Strong label.
export interface PasswordStrengthView {
  label: string;
  color: TextColor;
}

export interface CreatePasswordPageProps {
  password: string;
  strength?: PasswordStrengthView;
  confirmPassword: string;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  passwordError?: string;
  confirmError?: string;
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
  // The restore flow reuses this page with its own wording.
  submitLabel?: string;
  submittingLabel?: string;
}

export const CreatePasswordPage = ({
  password,
  strength,
  confirmPassword,
  onChangePassword,
  onChangeConfirmPassword,
  passwordError,
  confirmError,
  submitting,
  onSubmit,
  onBack,
  submitLabel = 'Create wallet',
  submittingLabel = 'Creating wallet…',
}: CreatePasswordPageProps): ReactElement => {
  const confirmRef = useRef<TextInputInstance>(null);

  const handleConfirmSubmit = (): void => {
    if (password && confirmPassword && !submitting) {
      onSubmit();
    }
  };

  return (
    <Screen
      header={<TopBar title='Set a password' onBack={onBack} />}
      footer={(
        <Button
          label={submitLabel}
          loadingLabel={submittingLabel}
          disabled={!password || !confirmPassword}
          loading={submitting}
          onPress={onSubmit}
          testID='password-submit'
        />
      )}
    >
      <Text variant='body' color='secondary'>This password unlocks Adena on this device. It cannot recover your wallet.</Text>
      <TextField
        label='Password'
        value={password}
        onChangeText={onChangePassword}
        placeholder='At least 8 characters'
        secure
        autoFocus
        returnKeyType='next'
        submitBehavior='submit'
        onSubmitEditing={() => confirmRef.current?.focus()}
        disabled={submitting}
        error={passwordError}
        testID='password-input'
      />
      {strength && !passwordError && (
        <Text variant='meta' color={strength.color} style={styles.strength} testID='password-strength'>
          {`Password strength: ${strength.label}`}
        </Text>
      )}
      <TextField
        ref={confirmRef}
        label='Confirm password'
        value={confirmPassword}
        onChangeText={onChangeConfirmPassword}
        placeholder='Enter the password again'
        secure
        returnKeyType='done'
        onSubmitEditing={handleConfirmSubmit}
        disabled={submitting}
        error={confirmError}
        testID='password-confirm'
      />
    </Screen>
  );
};
