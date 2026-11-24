import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useEffect, useRef } from 'react';

import { SplashPage } from '../../components/pages';
import { useContainer } from '../../di/container-provider';
import { describeBiometricFailure } from '../../hooks/use-biometric-password';
import { LockedStackParamList } from '../../navigation/types';
import { useBiometricStatusQuery } from '../../queries/wallet.queries';
import { SessionStatus, useSessionStore } from '../../stores/session.store';
import { getBiometryLabel } from '../../utils/biometry';

// First screen of every lock episode: one biometric attempt, then the password screen on any failure.
export const SplashScreen = ({ navigation }: NativeStackScreenProps<LockedStackParamList, 'Splash'>): ReactElement => {
  const { walletService } = useContainer();
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
      (error: unknown) => {
        if (mountedRef.current) {
          navigation.replace('Unlock', { error: describeBiometricFailure(error, label) });
        }
      },
    );
  }, [biometric.data, biometric.isPending, navigation, walletService]);

  return <SplashPage accessibilityLabel='Adena, unlocking' />;
};
