import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useState } from 'react';

import { BackupPhrasePage } from '../../../components/pages';
import { useHideWhenInactive } from '../../../hooks/use-hide-when-inactive';
import { OnboardingStackParamList } from '../../../navigation/types';
import { useOnboardingStore } from '../../../stores/onboarding.store';

export const BackupPhraseScreen = ({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'BackupPhrase'>): ReactElement => {
  const mnemonic = useOnboardingStore(state => state.mnemonic);
  const [acknowledged, setAcknowledged] = useState(false);
  const { hidden, reveal } = useHideWhenInactive();

  const handleContinue = (): void => navigation.navigate('CreatePassword');

  return (
    <BackupPhrasePage
      words={mnemonic?.split(' ') ?? []}
      hidden={hidden}
      onReveal={reveal}
      acknowledged={acknowledged}
      onToggleAcknowledged={setAcknowledged}
      onContinue={handleContinue}
      onBack={navigation.goBack}
    />
  );
};
