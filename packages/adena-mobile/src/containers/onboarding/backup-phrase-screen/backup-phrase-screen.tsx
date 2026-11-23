import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useState } from 'react';

import { BackupPhrasePage } from '../../../components/pages';
import { OnboardingStackParamList } from '../../../navigation/types';
import { useOnboardingStore } from '../../../stores/onboarding.store';

export const BackupPhraseScreen = ({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'BackupPhrase'>): ReactElement => {
  const mnemonic = useOnboardingStore(state => state.mnemonic);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleContinue = (): void => navigation.navigate('CreatePassword');

  return (
    <BackupPhrasePage
      words={mnemonic?.split(' ') ?? []}
      acknowledged={acknowledged}
      onToggleAcknowledged={setAcknowledged}
      onContinue={handleContinue}
      onBack={navigation.goBack}
    />
  );
};
