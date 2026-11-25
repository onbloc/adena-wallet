import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useEffect, useRef } from 'react';

import { SplashPage } from '../../components/pages';
import { AppErrorCode, isAppError } from '../../core/errors';
import { useContainer } from '../../di/container-provider';
import { describeBiometricFailure } from '../../hooks/use-biometric-password';
import { LockedStackParamList } from '../../navigation/types';
import { queryKeys } from '../../queries/query-keys';
import { useBiometricStatusQuery } from '../../queries/wallet.queries';
import { SessionStatus, useSessionStore } from '../../stores/session.store';
import { getBiometryLabel } from '../../utils/biometry';

// First screen of every lock episode: one biometric attempt, then the password screen on any failure.
export const SplashScreen = ({ navigation }: NativeStackScreenProps<LockedStackParamList, 'Splash'>): ReactElement => {
  const { walletService } = useContainer();
  const queryClient = useQueryClient();
  const biometric = useBiometricStatusQuery();
  const attemptedRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (biometric.isPending || attemptedRef.current) {
      return;
    }

    attemptedRef.current = true;

    if (!biometric.data?.enabled) {
      navigation.replace('Unlock');
      return;
    }

    const label = getBiometryLabel(biometric.data.kind);

    walletService.unlockWithBiometrics({ title: 'Unlock Adena', cancel: 'Use password' }).then(
      () => {
        const session = useSessionStore.getState();

        session.bumpRevision();
        session.setStatus(SessionStatus.UNLOCKED);
      },
      async (error: unknown) => {
        // The setting was turned off; refresh so the unlock screen does not prompt again.
        if (isAppError(error, AppErrorCode.BIOMETRICS_INVALIDATED)) {
          await queryClient.invalidateQueries({ queryKey: queryKeys.biometric() });
        }

        if (mountedRef.current) {
          navigation.replace('Unlock', { error: describeBiometricFailure(error, label) });
        }
      },
    );
  }, [biometric.data, biometric.isPending, navigation, queryClient, walletService]);

  return <SplashPage accessibilityLabel='Adena, unlocking' />;
};
