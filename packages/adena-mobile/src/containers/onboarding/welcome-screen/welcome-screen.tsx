import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement } from 'react';

import { WelcomePage } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { OnboardingStackParamList } from '../../../navigation/types';
import { useOnboardingStore } from '../../../stores/onboarding.store';

export const WelcomeScreen = ({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>): ReactElement => {
  const { walletService } = useContainer();
  const setMnemonic = useOnboardingStore(state => state.setMnemonic);

  const handleCreateWallet = (): void => {
    setMnemonic(walletService.generateMnemonic());
    navigation.navigate('BackupPhrase');
  };

  const handleImportWallet = (): void => {
    setMnemonic(null);
    navigation.navigate('ImportWallet');
  };

  return (
    <WelcomePage
      onCreateWallet={handleCreateWallet}
      onImportWallet={handleImportWallet}
    />
  );
};
