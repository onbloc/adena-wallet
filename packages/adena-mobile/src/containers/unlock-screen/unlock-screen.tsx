import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useCallback, useEffect, useRef, useState } from 'react';

import { UnlockPage } from '../../components/pages';
import { toErrorMessage } from '../../core/error-message';
import { AppErrorCode, isAppError } from '../../core/errors';
import { useContainer } from '../../di/container-provider';
import { LockedStackParamList } from '../../navigation/types';
import { useBiometricStatusQuery } from '../../queries/wallet.queries';
import { SessionStatus, useSessionStore } from '../../stores/session.store';
import { getBiometryLabel } from '../../utils/biometry';

export const UnlockScreen = ({ navigation }: NativeStackScreenProps<LockedStackParamList, 'Unlock'>): ReactElement => {
  const { walletService } = useContainer();
  const { setStatus, bumpRevision } = useSessionStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const biometric = useBiometricStatusQuery();
  const biometricLabel = biometric.data?.enabled ? getBiometryLabel(biometric.data.kind) : undefined;
  const autoPromptedRef = useRef(false);

  const onUnlocked = useCallback(() => {
    bumpRevision();
    setStatus(SessionStatus.UNLOCKED);
  }, [bumpRevision, setStatus]);

  const unlockWithBiometrics = useCallback(async () => {
    try {
      await walletService.unlockWithBiometrics({ title: 'Unlock Adena', cancel: 'Use password' });
      onUnlocked();
    }
    catch (unlockError) {
      if (!isAppError(unlockError, AppErrorCode.BIOMETRICS_CANCELED)) {
        setError(toErrorMessage(unlockError));
      }
    }
  }, [onUnlocked, walletService]);

  // Offer the biometric prompt once as soon as the status query reports it is enabled.
  useEffect(() => {
    if (biometric.data?.enabled && !autoPromptedRef.current) {
      autoPromptedRef.current = true;
      unlockWithBiometrics();
    }
  }, [biometric.data?.enabled, unlockWithBiometrics]);

  const unlock = async (): Promise<void> => {
    if (!password || submitting) {
      return;
    }

    setSubmitting(true);

    try {
      await walletService.unlock(password);
      setPassword('');
      onUnlocked();
    }
    catch (unlockError) {
      setError(isAppError(unlockError, AppErrorCode.INVALID_PASSWORD) ? 'Incorrect password.' : toErrorMessage(unlockError));
    }
    finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = (value: string): void => {
    setPassword(value);
    setError(undefined);
  };

  const handleResetWallet = (): void => navigation.navigate('ResetWallet');

  return (
    <UnlockPage
      password={password}
      onChangePassword={handleChangePassword}
      error={error}
      submitting={submitting}
      onUnlock={unlock}
      biometricLabel={biometricLabel}
      onBiometricUnlock={biometricLabel ? unlockWithBiometrics : undefined}
      onResetWallet={handleResetWallet}
    />
  );
};
