import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useCallback } from 'react';

import { BackupMethodPage } from '../../../components/pages';
import { OnboardingStackParamList } from '../../../navigation/types';
import { useOnboardingStore } from '../../../stores/onboarding.store';
import { useCloudProvider } from '../use-cloud-restore';

export const BackupMethodScreen = ({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'BackupMethod'>): ReactElement => {
  const setBackupPassword = useOnboardingStore(state => state.setBackupPassword);
  const cloudProvider = useCloudProvider({ forRestore: false });

  // Coming back here means a new choice, so a backup password picked before is dropped.
  useFocusEffect(useCallback(() => setBackupPassword(null), [setBackupPassword]));

  return (
    <BackupMethodPage
      cloudProviderName={cloudProvider}
      onCloudBackup={() => navigation.navigate('BackupPassword')}
      onManualBackup={() => navigation.navigate('BackupPhrase')}
      onBackUpLater={() => navigation.navigate('ProtectWallet')}
      onBack={navigation.goBack}
    />
  );
};
