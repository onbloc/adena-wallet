import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useRef, useState } from 'react';

import { CreatePasswordPage, PasswordStrengthView } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { OnboardingStackParamList } from '../../../navigation/types';
import { useBiometricStatusQuery } from '../../../queries/wallet.queries';
import { evaluatePassword, findPasswordIssue, PASSWORD_ISSUE_MESSAGE, PasswordIssue, PasswordStrength } from '../../../security/password-policy';
import { useOnboardingStore } from '../../../stores/onboarding.store';
import { SessionStatus, useSessionStore } from '../../../stores/session.store';
import { useToastStore } from '../../../stores/toast.store';
import { getBiometryLabel } from '../../../utils/biometry';

export const CreatePasswordScreen = ({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'CreatePassword'>): ReactElement => {
  const { walletService } = useContainer();
  const mnemonic = useOnboardingStore(state => state.mnemonic);
  const clearOnboarding = useOnboardingStore(state => state.clear);
  const { setStatus, bumpRevision } = useSessionStore();
  const showToast = useToastStore(state => state.show);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();
  const biometric = useBiometricStatusQuery();
  const biometricLabel = getBiometryLabel(biometric.data?.kind ?? null);
  // Defaults to on when the device supports biometrics, until the user decides.
  const [biometricChoice, setBiometricChoice] = useState<boolean>();
  const biometricEnabled = biometricChoice ?? Boolean(biometric.data?.kind);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const evaluation = password ? evaluatePassword(password) : null;
  const strength: PasswordStrengthView | undefined = evaluation?.valid
    ? evaluation.strength === PasswordStrength.STRONG
      ? { label: 'Strong', color: 'success' }
      : { label: 'Medium', color: 'warning' }
    : undefined;

  const submit = async (): Promise<void> => {
    if (submittingRef.current) {
      return;
    }

    const issue = findPasswordIssue(password, { confirm: confirmPassword });

    if (issue === PasswordIssue.NOT_MATCH) {
      setConfirmError(PASSWORD_ISSUE_MESSAGE[issue]);
      return;
    }

    if (issue) {
      setPasswordError(PASSWORD_ISSUE_MESSAGE[issue]);
      return;
    }

    if (!mnemonic) {
      navigation.popToTop();
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      await walletService.createWallet({ mnemonic, password });

      if (biometricEnabled) {
        await walletService.enableBiometricUnlock(password).catch(() => {
          showToast('Biometric unlock could not be enabled', 'warning');
        });
      }

      clearOnboarding();
      bumpRevision();
      setStatus(SessionStatus.UNLOCKED);
    }
    catch (error) {
      // A failure after the vault was written must not leave onboarding over an existing wallet.
      if (await walletService.getStatus().then(status => status !== SessionStatus.EMPTY, () => false)) {
        walletService.lock();
        clearOnboarding();
        showToast('Your wallet was saved. Unlock it to continue.', 'warning');
        setStatus(SessionStatus.LOCKED);
        return;
      }

      submittingRef.current = false;
      setPasswordError(toErrorMessage(error));
      setSubmitting(false);
    }
  };

  const handleChangePassword = (value: string): void => {
    setPassword(value);
    setPasswordError(undefined);
  };

  const handleChangeConfirmPassword = (value: string): void => {
    setConfirmPassword(value);
    setConfirmError(undefined);
  };

  return (
    <CreatePasswordPage
      password={password}
      strength={strength}
      confirmPassword={confirmPassword}
      onChangePassword={handleChangePassword}
      onChangeConfirmPassword={handleChangeConfirmPassword}
      passwordError={passwordError}
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
