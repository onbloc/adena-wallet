import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement } from 'react';

import { ImportMethodPage } from '../../../components/pages';
import { OnboardingStackParamList } from '../../../navigation/types';
import { useOnboardingStore } from '../../../stores/onboarding.store';
import { useCloudProvider } from '../use-cloud-restore';

export const ImportMethodScreen = ({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'ImportMethod'>): ReactElement => {
  const clearOnboarding = useOnboardingStore(state => state.clear);
  const restoreProvider = useCloudProvider({ forRestore: true });

  const handleRecoveryPhrase = (): void => {
    clearOnboarding();
    navigation.navigate('ImportWallet');
  };

  const handleCloudBackup = (): void => {
    clearOnboarding();
    navigation.navigate('RestoreBackup');
  };

  return (
    <ImportMethodPage
      onRecoveryPhrase={handleRecoveryPhrase}
      cloudProviderName={restoreProvider}
      onCloudBackup={handleCloudBackup}
      onBack={navigation.goBack}
    />
  );
};
