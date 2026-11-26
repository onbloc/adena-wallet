import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { TextInputInstance } from 'react-native';

import { ChangePasswordPage, PasswordStrengthView } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { AppErrorCode, isAppError } from '../../../core/errors';
import { useContainer } from '../../../di/container-provider';
import { useBiometricPassword } from '../../../hooks/use-biometric-password';
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
  // Turning biometrics back on must not require a new password.
  const biometricOnly = Boolean(biometricLabel) && biometricEnabled !== Boolean(biometric.data?.enabled) && !newPassword && !confirmPassword;
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const biometricPassword = useBiometricPassword();
  const { option: biometricOption, read: readBiometricPassword } = biometricPassword;
  // The current password released by biometrics; never rendered, cleared with the other passwords.
  const verifiedPasswordRef = useRef<string | null>(null);
  const [verifiedWith, setVerifiedWith] = useState<string>();
  const autoPromptedRef = useRef(false);
  const currentInputRef = useRef<TextInputInstance>(null);
  const newInputRef = useRef<TextInputInstance>(null);

  // Passwords do not outlive the screen's focus.
  useEffect(() => {
    const clearPasswords = (): void => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      verifiedPasswordRef.current = null;
      setVerifiedWith(undefined);
    };
    const unsubscribeBlur = navigation.addListener('blur', clearPasswords);
    // Leaving mid-change would let the completion's goBack pop the screen below.
    const unsubscribeBeforeRemove = navigation.addListener('beforeRemove', (event) => {
      if (submittingRef.current) {
        event.preventDefault();
      }
    });

    return (): void => {
      unsubscribeBlur();
      unsubscribeBeforeRemove();
      clearPasswords();
    };
  }, [navigation]);

  const verifyCurrentWithBiometrics = useCallback(async (): Promise<void> => {
    if (!biometricOption || submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setCurrentError(undefined);
    const result = await readBiometricPassword({ title: 'Change password', cancel: 'Use password' });

    submittingRef.current = false;
    setSubmitting(false);

    if (result.ok) {
      verifiedPasswordRef.current = result.password;
      setCurrentPassword('');
      setVerifiedWith(biometricOption.label);
      newInputRef.current?.focus();
      return;
    }

    setCurrentError(result.message);
    currentInputRef.current?.focus();
  }, [biometricOption, readBiometricPassword]);

  // Biometrics first for the current password, once; the focused field is the fallback.
  useEffect(() => {
    if (!biometricPassword.ready || autoPromptedRef.current) {
      return;
    }

    autoPromptedRef.current = true;

    if (biometricOption) {
      void verifyCurrentWithBiometrics();
    }
    else {
      currentInputRef.current?.focus();
    }
  }, [biometricOption, biometricPassword.ready, verifyCurrentWithBiometrics]);

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
      // Keep the preference consistent: the old credential was already removed before re-encrypting.
      await walletService.disableBiometricUnlock().catch(() => undefined);
      setBiometricChoice(false);
      showToast(`Password changed, but ${biometricLabel ?? 'biometric'} unlock could not be updated`, 'warning');
      return false;
    }
    finally {
      await queryClient.invalidateQueries({ queryKey: queryKeys.biometric() });
    }
  };

  // Enabling verifies the current password; disabling needs it too, so the screen asks the same either way.
  const saveBiometricOnly = async (current: string): Promise<void> => {
    submittingRef.current = true;
    setSubmitting(true);

    try {
      if (biometricEnabled) {
        await walletService.enableBiometricUnlock(current);
      }
      else {
        await walletService.verifyPassword(current);
        await walletService.disableBiometricUnlock();
      }
    }
    catch (error) {
      if (isAppError(error, AppErrorCode.INVALID_PASSWORD)) {
        // Shows the current-password field again, where the error is rendered.
        verifiedPasswordRef.current = null;
        setVerifiedWith(undefined);
        setCurrentError('Incorrect password.');
      }
      else {
        // The field may be hidden after biometric verification, so a save failure needs its own message;
        // the switch goes back to the stored setting.
        setBiometricChoice(undefined);
        showToast(`Couldn’t turn ${biometricEnabled ? 'on' : 'off'} ${biometricLabel ?? 'biometric'} unlock: ${toErrorMessage(error)}`, 'error');
      }

      submittingRef.current = false;
      setSubmitting(false);
      return;
    }
    finally {
      await queryClient.invalidateQueries({ queryKey: queryKeys.biometric() });
    }

    showToast(`${biometricLabel ?? 'Biometric'} unlock turned ${biometricEnabled ? 'on' : 'off'}`, 'success');
    submittingRef.current = false;
    navigation.goBack();
  };

  const submit = async (): Promise<void> => {
    if (submittingRef.current) {
      return;
    }

    const current = verifiedPasswordRef.current ?? currentPassword;

    if (!current) {
      return;
    }

    if (biometricOnly) {
      await saveBiometricOnly(current);
      return;
    }

    const issue = findPasswordIssue(newPassword, { current, confirm: confirmPassword });

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
      await walletService.changePassword(current, newPassword);
    }
    catch (error) {
      // The biometric credential may already be gone (it is removed before re-encrypting).
      queryClient.invalidateQueries({ queryKey: queryKeys.biometric() });

      if (isAppError(error, AppErrorCode.WEAK_PASSWORD)) {
        setNewError(error.message);
      }
      else {
        if (isAppError(error, AppErrorCode.INVALID_PASSWORD)) {
          verifiedPasswordRef.current = null;
          setVerifiedWith(undefined);
        }

        setCurrentError(isAppError(error, AppErrorCode.INVALID_PASSWORD) ? 'Incorrect password.' : toErrorMessage(error));
      }

      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    if (await applyBiometricChoice(newPassword)) {
      showToast('Password changed', 'success');
    }

    submittingRef.current = false;
    navigation.goBack();
  };

  const handleBack = (): void => {
    if (!submittingRef.current) {
      navigation.goBack();
    }
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
      biometricOnly={biometricOnly}
      submitting={submitting}
      onSubmit={submit}
      onBack={handleBack}
      currentVerifiedWith={verifiedWith}
      currentBiometric={biometricOption && { ...biometricOption, onPress: verifyCurrentWithBiometrics }}
      currentPasswordRef={currentInputRef}
      newPasswordRef={newInputRef}
    />
  );
};
