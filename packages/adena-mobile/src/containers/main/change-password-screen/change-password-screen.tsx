import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useEffect, useRef, useState } from 'react';

import { ChangePasswordPage, PasswordStrengthView } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { AppErrorCode, isAppError } from '../../../core/errors';
import { useContainer } from '../../../di/container-provider';
import { MainStackParamList } from '../../../navigation/types';
import { queryKeys } from '../../../queries/query-keys';
import { useBiometricStatusQuery } from '../../../queries/wallet.queries';
import { evaluatePassword, findPasswordIssue, PASSWORD_ISSUE_MESSAGE, PasswordIssue, PasswordStrength } from '../../../security/password-policy';
import { useToastStore } from '../../../stores/toast.store';
import { getBiometryLabel } from '../../../utils/biometry';

export const ChangePasswordScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'ChangePassword'>): ReactElement => {
  const { walletService } = useContainer();
  const queryClient = useQueryClient();
  const showToast = useToastStore(state => state.show);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentError, setCurrentError] = useState<string>();
  const [newError, setNewError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();
  const biometric = useBiometricStatusQuery();
  const biometricLabel = getBiometryLabel(biometric.data?.kind ?? null);
  // Follows the stored status until the user flips the switch.
  const [biometricChoice, setBiometricChoice] = useState<boolean>();
  const biometricEnabled = biometricChoice ?? Boolean(biometric.data?.enabled);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Passwords do not outlive the screen's focus.
  useEffect(() => {
    const clearPasswords = (): void => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    };
    const unsubscribeBlur = navigation.addListener('blur', clearPasswords);

    return (): void => {
      unsubscribeBlur();
      clearPasswords();
    };
  }, [navigation]);

  const evaluation = newPassword ? evaluatePassword(newPassword) : null;
  const strength: PasswordStrengthView | undefined = evaluation?.valid
    ? evaluation.strength === PasswordStrength.STRONG
      ? { label: 'Strong', color: 'success' }
      : { label: 'Medium', color: 'warning' }
    : undefined;

  // The password is already changed here, so a biometric failure only warns. Resolves false on failure.
  const applyBiometricChoice = async (password: string): Promise<boolean> => {
    try {
      if (biometricLabel && biometricEnabled) {
        await walletService.enableBiometricUnlock(password);
      }
      else if (biometric.data?.enabled) {
        await walletService.disableBiometricUnlock();
      }

      return true;
    }
    catch {
      // Drop the credential escrowed with the old password; it can no longer unlock.
      await walletService.disableBiometricUnlock().catch(() => undefined);
      setBiometricChoice(false);
      showToast(`Password changed, but ${biometricLabel ?? 'biometric'} unlock could not be updated`, 'warning');
      return false;
    }
    finally {
      await queryClient.invalidateQueries({ queryKey: queryKeys.biometric() });
    }
  };

  const submit = async (): Promise<void> => {
    if (submittingRef.current) {
      return;
    }

    const issue = findPasswordIssue(newPassword, { current: currentPassword, confirm: confirmPassword });

    if (issue === PasswordIssue.NOT_MATCH) {
      setConfirmError(PASSWORD_ISSUE_MESSAGE[issue]);
      return;
    }

    if (issue) {
      setNewError(PASSWORD_ISSUE_MESSAGE[issue]);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      await walletService.changePassword(currentPassword, newPassword);
    }
    catch (error) {
      if (isAppError(error, AppErrorCode.WEAK_PASSWORD)) {
        setNewError(error.message);
      }
      else {
        setCurrentError(isAppError(error, AppErrorCode.INVALID_PASSWORD) ? 'Incorrect password.' : toErrorMessage(error));
      }

      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    if (await applyBiometricChoice(newPassword)) {
      showToast('Password changed', 'success');
    }

    navigation.goBack();
  };

  const handleChangeCurrentPassword = (value: string): void => {
    setCurrentPassword(value);
    setCurrentError(undefined);
  };

  const handleChangeNewPassword = (value: string): void => {
    setNewPassword(value);
    setNewError(undefined);
  };

  const handleChangeConfirmPassword = (value: string): void => {
    setConfirmPassword(value);
    setConfirmError(undefined);
  };

  return (
    <ChangePasswordPage
      currentPassword={currentPassword}
      newPassword={newPassword}
      confirmPassword={confirmPassword}
      strength={strength}
      onChangeCurrentPassword={handleChangeCurrentPassword}
      onChangeNewPassword={handleChangeNewPassword}
      onChangeConfirmPassword={handleChangeConfirmPassword}
      currentError={currentError}
      newError={newError}
      confirmError={confirmError}
      biometricLabel={biometricLabel}
      biometricEnabled={biometricEnabled}
      onToggleBiometric={setBiometricChoice}
      submitting={submitting}
      onSubmit={submit}
      onBack={navigation.goBack}
    />
  );
};
