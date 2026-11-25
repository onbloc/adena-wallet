import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useEffect, useRef, useState } from 'react';

import { CreatePasswordPage, PasswordStrengthView } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { OnboardingStackParamList } from '../../../navigation/types';
import { evaluatePassword, findPasswordIssue, PASSWORD_ISSUE_MESSAGE, PasswordIssue, PasswordStrength } from '../../../security/password-policy';
import { ENABLE_BIOMETRICS_PROMPT } from '../../../services/wallet.service';
import { useOnboardingStore } from '../../../stores/onboarding.store';
import { SessionStatus, useSessionStore } from '../../../stores/session.store';
import { useToastStore } from '../../../stores/toast.store';

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
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Follows the full policy (length too), so a label never shows for a password submit would reject.
  const strength: PasswordStrengthView | undefined = password && !findPasswordIssue(password)
    ? evaluatePassword(password).strength === PasswordStrength.STRONG
      ? { label: 'Strong', color: 'success' }
      : { label: 'Medium', color: 'warning' }
    : undefined;

  // Leaving mid-submit would let the stale phrase still create the wallet behind the user's back.
  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    if (submittingRef.current) {
      event.preventDefault();
    }
  }), [navigation]);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !submitting });
  }, [navigation, submitting]);

  const handleBack = (): void => {
    if (!submittingRef.current) {
      navigation.goBack();
    }
  };

  // Like MetaMask, biometrics turn on by default when supported; a failure or cancel never blocks onboarding.
  const enableBiometricsIfSupported = async (): Promise<void> => {
    try {
      if (await walletService.getBiometryKind()) {
        await walletService.enableBiometricUnlock(password, ENABLE_BIOMETRICS_PROMPT);
      }
    }
    catch {
      showToast('Biometric unlock could not be enabled', 'warning');
    }
  };

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

      await enableBiometricsIfSupported();

      // The biometric prompt can outlive a lock (e.g. the error boundary); never reopen a closed session.
      const status = await walletService.getStatus().catch(() => SessionStatus.LOCKED);

      clearOnboarding();
      bumpRevision();

      if (status === SessionStatus.EMPTY) {
        // A reset removed the new wallet meanwhile; start onboarding over.
        submittingRef.current = false;
        setSubmitting(false);
        navigation.popToTop();
        return;
      }

      if (status !== SessionStatus.UNLOCKED) {
        walletService.lock();
        showToast('Your wallet was saved. Unlock it to continue.', 'warning');
        setStatus(SessionStatus.LOCKED);
        return;
      }

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
    // The vault is encrypted with the password captured on submit; later edits would not apply.
    if (submittingRef.current) {
      return;
    }

    setPassword(value);
    setPasswordError(undefined);
  };

  const handleChangeConfirmPassword = (value: string): void => {
    if (submittingRef.current) {
      return;
    }

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
      submitting={submitting}
      onSubmit={submit}
      onBack={handleBack}
    />
  );
};
