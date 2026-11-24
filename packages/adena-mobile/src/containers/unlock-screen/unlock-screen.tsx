import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { TextInputInstance } from 'react-native';

import { UnlockPage } from '../../components/pages';
import { toErrorMessage } from '../../core/error-message';
import { AppErrorCode, isAppError } from '../../core/errors';
import { useContainer } from '../../di/container-provider';
import { LockedStackParamList } from '../../navigation/types';
import { queryKeys } from '../../queries/query-keys';
import { useBiometricStatusQuery } from '../../queries/wallet.queries';
import { BiometryKind } from '../../security/secure-store';
import { SessionStatus, useSessionStore } from '../../stores/session.store';
import { getBiometryLabel } from '../../utils/biometry';

export const UnlockScreen = ({ navigation }: NativeStackScreenProps<LockedStackParamList, 'Unlock'>): ReactElement => {
  const { walletService } = useContainer();
  const queryClient = useQueryClient();
  const { setStatus, bumpRevision } = useSessionStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const biometric = useBiometricStatusQuery();
  const biometricLabel = biometric.data?.enabled ? getBiometryLabel(biometric.data.kind) : undefined;
  const autoPromptedRef = useRef(false);
  const passwordRef = useRef<TextInputInstance>(null);
  // Password and biometric unlocks share one in-flight slot, so they never queue up behind each other.
  const unlockingRef = useRef(false);

  const onUnlocked = useCallback(() => {
    bumpRevision();
    setStatus(SessionStatus.UNLOCKED);
  }, [bumpRevision, setStatus]);

  const unlockWithBiometrics = useCallback(async () => {
    if (unlockingRef.current) {
      return;
    }

    unlockingRef.current = true;

    try {
      await walletService.unlockWithBiometrics({ title: 'Unlock Adena', cancel: 'Use password' });
      onUnlocked();
    }
    catch (unlockError) {
      // Only a permanent invalidation drops the setting; lockouts and missing enrollment are transient.
      if (isAppError(unlockError, AppErrorCode.BIOMETRICS_INVALIDATED)) {
        await walletService.disableBiometricUnlock().catch(() => undefined);
        await queryClient.invalidateQueries({ queryKey: queryKeys.biometric() });
      }

      if (!isAppError(unlockError, AppErrorCode.BIOMETRICS_CANCELED)) {
        setError(toErrorMessage(unlockError));
      }

      passwordRef.current?.focus();
    }
    finally {
      unlockingRef.current = false;
    }
  }, [onUnlocked, queryClient, walletService]);

  // Offer the biometric prompt once as soon as the status query reports it is enabled.
  // Without biometrics the password field takes focus instead.
  useEffect(() => {
    if (biometric.isPending || autoPromptedRef.current) {
      return;
    }

    autoPromptedRef.current = true;

    if (biometric.data?.enabled) {
      unlockWithBiometrics();
    }
    else {
      passwordRef.current?.focus();
    }
  }, [biometric.data?.enabled, biometric.isPending, unlockWithBiometrics]);

  const unlock = async (): Promise<void> => {
    if (!password || unlockingRef.current) {
      return;
    }

    unlockingRef.current = true;
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
      unlockingRef.current = false;
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
      biometricIcon={biometric.data?.kind === BiometryKind.FINGERPRINT ? 'fingerprint' : 'faceId'}
      passwordRef={passwordRef}
      onBiometricUnlock={biometricLabel ? unlockWithBiometrics : undefined}
      onResetWallet={handleResetWallet}
    />
  );
};
