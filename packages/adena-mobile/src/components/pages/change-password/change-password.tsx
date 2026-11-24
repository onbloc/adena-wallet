import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Switch, Text } from '../../atoms';
import { Screen, TextField, TopBar } from '../../molecules';
import { PasswordStrengthView } from '../create-password';
import { styles } from './change-password.styles';

export interface ChangePasswordPageProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  strength?: PasswordStrengthView;
  onChangeCurrentPassword: (value: string) => void;
  onChangeNewPassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  currentError?: string;
  newError?: string;
  confirmError?: string;
  // Hidden when the device has no enrolled biometrics.
  biometricLabel?: string;
  biometricEnabled: boolean;
  onToggleBiometric: (value: boolean) => void;
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

export const ChangePasswordPage = ({
  currentPassword,
  newPassword,
  confirmPassword,
  strength,
  onChangeCurrentPassword,
  onChangeNewPassword,
  onChangeConfirmPassword,
  currentError,
  newError,
  confirmError,
  biometricLabel,
  biometricEnabled,
  onToggleBiometric,
  submitting,
  onSubmit,
  onBack,
}: ChangePasswordPageProps): ReactElement => (
  <Screen
    header={<TopBar title='Change password' onBack={onBack} />}
    footer={(
      <Button
        label='Change password'
        loadingLabel='Changing password…'
        disabled={!currentPassword || !newPassword || !confirmPassword}
        loading={submitting}
        onPress={onSubmit}
        testID='change-password-submit'
      />
    )}
  >
    <Text variant='body' color='secondary'>This password unlocks Adena on this device. It cannot recover your wallet.</Text>
    <TextField
      label='Current password'
      value={currentPassword}
      onChangeText={onChangeCurrentPassword}
      placeholder='Enter your current password'
      secure
      autoCapitalize='none'
      textContentType='password'
      error={currentError}
      testID='current-password-input'
    />
    <TextField
      label='New password'
      value={newPassword}
      onChangeText={onChangeNewPassword}
      placeholder='At least 8 characters'
      secure
      autoCapitalize='none'
      textContentType='newPassword'
      error={newError}
      testID='new-password-input'
    />
    {strength && !newError && (
      <Text variant='meta' color={strength.color} style={styles.strength} testID='new-password-strength'>
        {`Password strength: ${strength.label}`}
      </Text>
    )}
    <TextField
      label='Confirm new password'
      value={confirmPassword}
      onChangeText={onChangeConfirmPassword}
      placeholder='Enter the new password again'
      secure
      autoCapitalize='none'
      textContentType='newPassword'
      error={confirmError}
      testID='new-password-confirm'
    />
    {biometricLabel && (
      <View style={styles.row}>
        <Text variant='row' style={styles.label}>{`Unlock with ${biometricLabel}`}</Text>
        <Switch value={biometricEnabled} onValueChange={onToggleBiometric} disabled={submitting} accessibilityLabel={`Unlock with ${biometricLabel}`} />
      </View>
    )}
  </Screen>
);
