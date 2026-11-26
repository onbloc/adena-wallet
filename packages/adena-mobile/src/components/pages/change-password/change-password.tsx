import React, { ReactElement, RefObject, useRef } from 'react';
import { TextInputInstance, View } from 'react-native';

import { Button, IconName, Switch, Text } from '../../atoms';
import { InlineAlert, Screen, TextField, TopBar } from '../../molecules';
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
  // The switch changed with no new password: submitting saves only the biometric setting.
  biometricOnly?: boolean;
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
  // Set once biometrics released the current password; the field is then hidden.
  currentVerifiedWith?: string;
  // Retries biometrics for the current password after a cancel or failure.
  currentBiometric?: { label: string; icon: IconName; onPress: () => void };
  // Let the screen focus a field after a biometric result.
  currentPasswordRef?: RefObject<TextInputInstance | null>;
  newPasswordRef?: RefObject<TextInputInstance | null>;
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
  biometricOnly = false,
  submitting,
  onSubmit,
  onBack,
  currentVerifiedWith,
  currentBiometric,
  currentPasswordRef,
  newPasswordRef,
}: ChangePasswordPageProps): ReactElement => {
  const fallbackNewRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);
  const nextRef = newPasswordRef ?? fallbackNewRef;
  const canSubmit = Boolean((currentPassword || currentVerifiedWith) && ((newPassword && confirmPassword) || biometricOnly));

  const focusNew = (): void => nextRef.current?.focus();

  const handleSubmitEditing = (): void => {
    if (canSubmit && !submitting) {
      onSubmit();
    }
  };

  return (
    <Screen
      header={<TopBar title='Change password' onBack={onBack} />}
      footer={(
        <Button
          label={biometricOnly ? 'Save' : 'Change password'}
          loadingLabel={biometricOnly ? 'Saving…' : 'Changing password…'}
          disabled={!canSubmit}
          loading={submitting}
          onPress={onSubmit}
          testID='change-password-submit'
        />
      )}
    >
      <Text variant='body' color='secondary'>This password unlocks Adena on this device. It cannot recover your wallet.</Text>
      {currentVerifiedWith
        ? <InlineAlert tone='success' title={`Current password verified with ${currentVerifiedWith}`} />
        : (
            <>
              <TextField
                ref={currentPasswordRef}
                label='Current password'
                value={currentPassword}
                onChangeText={onChangeCurrentPassword}
                placeholder='Enter your current password'
                secure
                returnKeyType='next'
                submitBehavior='submit'
                onSubmitEditing={focusNew}
                error={currentError}
                testID='current-password-input'
              />
              {currentBiometric && (
                <Button
                  label={`Use ${currentBiometric.label}`}
                  tone='tertiary'
                  size='compact'
                  leadingIcon={currentBiometric.icon}
                  disabled={submitting}
                  onPress={currentBiometric.onPress}
                />
              )}
            </>
          )}
      <TextField
        ref={nextRef}
        label='New password'
        value={newPassword}
        onChangeText={onChangeNewPassword}
        placeholder='At least 8 characters'
        secure
        returnKeyType='next'
        submitBehavior='submit'
        onSubmitEditing={() => confirmRef.current?.focus()}
        error={newError}
        testID='new-password-input'
      />
      {strength && !newError && (
        <Text variant='meta' color={strength.color} style={styles.strength} testID='new-password-strength'>
          {`Password strength: ${strength.label}`}
        </Text>
      )}
      <TextField
        ref={confirmRef}
        label='Confirm new password'
        value={confirmPassword}
        onChangeText={onChangeConfirmPassword}
        placeholder='Enter the new password again'
        secure
        returnKeyType='done'
        onSubmitEditing={handleSubmitEditing}
        error={confirmError}
        testID='new-password-confirm'
      />
      {biometricLabel && (
        <View style={styles.row}>
          <Text variant='row' style={styles.label}>{`Unlock with ${biometricLabel}`}</Text>
          <Switch value={biometricEnabled} onValueChange={onToggleBiometric} disabled={submitting} accessibilityLabel={`Unlock with ${biometricLabel}`} />
        </View>
      )}
      {biometricLabel && (
        <Text variant='meta' color='secondary'>Leave the new password blank to keep your current password.</Text>
      )}
    </Screen>
  );
};
