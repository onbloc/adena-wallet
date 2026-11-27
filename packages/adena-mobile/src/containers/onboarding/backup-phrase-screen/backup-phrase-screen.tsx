import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useEffect, useRef, useState } from 'react';

import { BackupPhrasePage } from '../../../components/pages';
import { useHideWhenInactive } from '../../../hooks/use-hide-when-inactive';
import { OnboardingStackParamList } from '../../../navigation/types';
import { useOnboardingStore } from '../../../stores/onboarding.store';
import { useFinishOnboarding } from '../use-finish-onboarding';

export const BackupPhraseScreen = ({ navigation, route }: NativeStackScreenProps<OnboardingStackParamList, 'BackupPhrase'>): ReactElement => {
  const afterCreate = route.params?.afterCreate === true;
  const mnemonic = useOnboardingStore(state => state.mnemonic);
  const finishOnboarding = useFinishOnboarding();
  const [revealed, setRevealed] = useState(false);
  const { hidden, reveal } = useHideWhenInactive();
  const finishingRef = useRef(false);

  // The wallet already exists here, so going back to the password step would try to create it again.
  useEffect(() => {
    if (!afterCreate) {
      return;
    }

    navigation.setOptions({ gestureEnabled: false });
    return navigation.addListener('beforeRemove', (event) => {
      if (!finishingRef.current) {
        event.preventDefault();
      }
    });
  }, [afterCreate, navigation]);

  const handleReveal = (): void => {
    setRevealed(true);
    reveal();
  };

  const handleContinue = async (): Promise<void> => {
    if (!afterCreate) {
      navigation.navigate('ProtectWallet');
      return;
    }

    if (finishingRef.current) {
      return;
    }

    finishingRef.current = true;

    if (!(await finishOnboarding(navigation))) {
      finishingRef.current = false;
    }
  };

  return (
    <BackupPhrasePage
      words={mnemonic?.split(' ') ?? []}
      masked={!revealed || hidden}
      onReveal={handleReveal}
      canContinue={revealed}
      onContinue={handleContinue}
      onBack={afterCreate ? undefined : navigation.goBack}
    />
  );
};
