import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useState } from 'react';

import { BackupPhrasePage } from '../../../components/pages';
import { useHideWhenInactive } from '../../../hooks/use-hide-when-inactive';
import { OnboardingStackParamList } from '../../../navigation/types';
import { useOnboardingStore } from '../../../stores/onboarding.store';

export const BackupPhraseScreen = ({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'BackupPhrase'>): ReactElement => {
  const mnemonic = useOnboardingStore(state => state.mnemonic);
  const [revealed, setRevealed] = useState(false);
  const { hidden, reveal } = useHideWhenInactive();

  const handleReveal = (): void => {
    setRevealed(true);
    reveal();
  };

  return (
    <BackupPhrasePage
      words={mnemonic?.split(' ') ?? []}
      masked={!revealed || hidden}
      onReveal={handleReveal}
      canContinue={revealed}
      onContinue={() => navigation.navigate('ProtectWallet')}
      onBack={navigation.goBack}
    />
  );
};
