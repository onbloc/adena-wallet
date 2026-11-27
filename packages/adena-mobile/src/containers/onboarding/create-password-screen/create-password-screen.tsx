import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useEffect, useRef, useState } from 'react';

import { CreatePasswordPage, PasswordStrengthView } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { OnboardingStackParamList } from '../../../navigation/types';
import { cloudProviderName } from '../../../presenters/cloud-backup.presenter';
import { useBiometricStatusQuery } from '../../../queries/wallet.queries';
import { evaluatePassword, findPasswordIssue, PASSWORD_ISSUE_MESSAGE, PasswordIssue, PasswordStrength } from '../../../security/password-policy';
import { ENABLE_BIOMETRICS_PROMPT } from '../../../services/wallet.service';
import { useOnboardingStore } from '../../../stores/onboarding.store';
import { SessionStatus, useSessionStore } from '../../../stores/session.store';
import { useToastStore } from '../../../stores/toast.store';
import { getBiometryLabel } from '../../../utils/biometry';
import { useFinishOnboarding } from '../use-finish-onboarding';

// The backup keeps running afterwards; only onboarding stops waiting for it.
const CLOUD_BACKUP_TIMEOUT_MS = 60_000;

export const CreatePasswordScreen = ({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'CreatePassword'>): ReactElement => {
  const { walletService, cloudBackupService, backupReminder } = useContainer();
  const mnemonic = useOnboardingStore(state => state.mnemonic);
  const restoreBackup = useOnboardingStore(state => state.restoreBackup);
  const hdIndexes = useOnboardingStore(state => state.hdIndexes);
  const backupPassword = useOnboardingStore(state => state.backupPassword);
  const enableBiometrics = useOnboardingStore(state => state.enableBiometrics);
  const phraseSaved = useOnboardingStore(state => state.phraseSaved);
  const biometric = useBiometricStatusQuery();
  // Fixed at mount: the flow this screen was opened for. The store is cleared on success while the button
  // still shows its progress label, and a later change there (e.g. a stale restore) must not swap the flow.
  const [source] = useState(() => (restoreBackup ? { restoreBackup, mnemonic: null } : { restoreBackup: null, mnemonic }));
  const restoring = source.restoreBackup !== null;
  const clearOnboarding = useOnboardingStore(state => state.clear);
  const finishOnboarding = useFinishOnboarding();
  const setStatus = useSessionStore(state => state.setStatus);
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

  // Chosen on the protect step; a failure or cancel never blocks onboarding.
  const enableBiometricsIfChosen = async (): Promise<void> => {
    try {
      if (enableBiometrics && await walletService.getBiometryKind()) {
        await walletService.enableBiometricUnlock(password, ENABLE_BIOMETRICS_PROMPT);
      }
    }
    catch {
      showToast('Biometric unlock could not be enabled', 'warning');
    }
  };

  // Chosen on the backup step. Only an upload the provider confirmed counts; a slow provider
  // (e.g. an interactive sign-in) must not hold the new wallet on this screen.
  const createCloudBackupIfChosen = async (): Promise<'none' | 'confirmed' | 'pending' | 'failed'> => {
    if (!backupPassword) {
      return 'none';
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      const status = await Promise.race([
        cloudBackupService.createBackup({ walletPassword: password, backupPassword, confirmPassword: backupPassword }),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), CLOUD_BACKUP_TIMEOUT_MS);
        }),
      ]);

      if (status?.kind !== 'backedUp' || status.uploading?.error) {
        return 'failed';
      }

      return status.uploading ? 'pending' : 'confirmed';
    }
    catch {
      return 'failed';
    }
    finally {
      clearTimeout(timer);
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

    if (backupPassword && password === backupPassword) {
      setPasswordError('Use a different password from your backup password');
      return;
    }

    // The phrase or backup the user chose is gone or was replaced: start over instead of using another one.
    if ((!source.mnemonic && !source.restoreBackup) || mnemonic !== source.mnemonic || restoreBackup !== source.restoreBackup) {
      clearOnboarding();
      navigation.popToTop();
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    let keyringToBackUp: string | null = null;

    try {
      // A decrypted cloud backup is rebuilt with every keyring; otherwise one phrase becomes the wallet.
      if (source.restoreBackup) {
        await cloudBackupService.restoreWallet(source.restoreBackup, password);
      }
      else if (source.mnemonic) {
        const account = await walletService.createWallet({ mnemonic: source.mnemonic, password, hdIndexes: hdIndexes ?? undefined });

        // Stored before anything else can fail or the app is closed: Home asks for a backup until it is done.
        if (!phraseSaved) {
          keyringToBackUp = account.keyringId;
          backupReminder.require(account.keyringId);
        }
      }

      await enableBiometricsIfChosen();
      const backup = await createCloudBackupIfChosen();
      const provider = cloudProviderName(cloudBackupService.provider);

      if (backup === 'confirmed' && keyringToBackUp) {
        backupReminder.clear(keyringToBackUp);
      }
      else if (backup === 'failed') {
        showToast(`${provider} backup did not finish. Back up your recovery phrase from Home.`, 'warning');
      }
      else if (backup === 'pending') {
        showToast(`${provider} is still uploading your backup.`, 'info');
      }

      if (!(await finishOnboarding(navigation))) {
        submittingRef.current = false;
        setSubmitting(false);
      }
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
      // Same support rule as the protect step, which is shown only with a biometry label.
      eyebrow={getBiometryLabel(biometric.data?.kind ?? null) ? 'Setup / 2 of 2' : 'Setup / Password'}
      submitLabel={restoring ? 'Restore wallet' : undefined}
      submittingLabel={restoring ? 'Restoring wallet…' : undefined}
    />
  );
};
