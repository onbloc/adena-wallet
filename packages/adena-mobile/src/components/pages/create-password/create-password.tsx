import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Switch, Text, TextColor } from '../../atoms';
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
  biometricLabel?: string;
  biometricEnabled: boolean;
  onToggleBiometric: (value: boolean) => void;
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

export const CreatePasswordPage = ({
  password,
  strength,
  confirmPassword,
  onChangePassword,
  onChangeConfirmPassword,
  passwordError,
  confirmError,
  biometricLabel,
  biometricEnabled,
  onToggleBiometric,
  submitting,
  onSubmit,
  onBack,
}: CreatePasswordPageProps): ReactElement => (
  <Screen
    header={<TopBar title='Set a password' onBack={onBack} />}
    footer={(
      <Button
        label='Create wallet'
        loadingLabel='Creating wallet…'
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
      autoCapitalize='none'
      textContentType='newPassword'
      error={passwordError}
      testID='password-input'
    />
    {strength && !passwordError && (
      <Text variant='meta' color={strength.color} style={styles.strength} testID='password-strength'>
        {`Password strength: ${strength.label}`}
      </Text>
    )}
    <TextField
      label='Confirm password'
      value={confirmPassword}
      onChangeText={onChangeConfirmPassword}
      placeholder='Enter the password again'
      secure
      autoCapitalize='none'
      textContentType='newPassword'
      error={confirmError}
      testID='password-confirm'
    />
    {biometricLabel && (
      <View style={styles.row}>
        <Text variant='row' style={styles.label}>{`Unlock with ${biometricLabel}`}</Text>
        <Switch value={biometricEnabled} onValueChange={onToggleBiometric} accessibilityLabel={`Unlock with ${biometricLabel}`} />
      </View>
    )}
  </Screen>
);
