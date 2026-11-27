import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useEffect } from 'react';

import { Screen, TopBar } from '../../../components/molecules';
import { ProtectWalletPage } from '../../../components/pages';
import { OnboardingStackParamList } from '../../../navigation/types';
import { useBiometricStatusQuery } from '../../../queries/wallet.queries';
import { useOnboardingStore } from '../../../stores/onboarding.store';
import { getBiometryLabel } from '../../../utils/biometry';

// Only records the choice: biometric unlock needs the wallet password, so it is turned on when the wallet is created.
export const ProtectWalletScreen = ({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'ProtectWallet'>): ReactElement => {
  const setEnableBiometrics = useOnboardingStore(state => state.setEnableBiometrics);
  const biometric = useBiometricStatusQuery();
  const label = getBiometryLabel(biometric.data?.kind ?? null);
  const unsupported = biometric.isError || (biometric.isSuccess && !label);

  // Devices without enrolled biometrics skip this step.
  useEffect(() => {
    if (unsupported) {
      setEnableBiometrics(false);
      navigation.replace('CreatePassword');
    }
  }, [navigation, setEnableBiometrics, unsupported]);

  if (!label) {
    return <Screen scrollable={false} header={<TopBar onBack={navigation.goBack} />} />;
  }

  const choose = (enable: boolean): void => {
    setEnableBiometrics(enable);
    navigation.navigate('CreatePassword');
  };

  return (
    <ProtectWalletPage
      eyebrow='Setup / 1 of 2'
      biometryLabel={label}
      onEnable={() => choose(true)}
      onSkip={() => choose(false)}
      onBack={navigation.goBack}
    />
  );
};
