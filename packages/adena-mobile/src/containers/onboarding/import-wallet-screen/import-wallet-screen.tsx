import Clipboard from '@react-native-clipboard/clipboard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useState } from 'react';

import { ImportPhrasePage } from '../../../components/pages';
import { isValidMnemonic, normalizeMnemonic } from '../../../crypto/mnemonic';
import { useHideWhenInactive } from '../../../hooks/use-hide-when-inactive';
import { OnboardingStackParamList } from '../../../navigation/types';
import { useOnboardingStore } from '../../../stores/onboarding.store';

export const ImportWalletScreen = ({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'ImportWallet'>): ReactElement => {
  const setMnemonic = useOnboardingStore(state => state.setMnemonic);
  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState<string>();
  const { hidden, reveal } = useHideWhenInactive();

  const handleChangePhrase = (value: string): void => {
    setPhrase(value);
    setError(undefined);
  };

  const handlePaste = async (): Promise<void> => {
    const text = await Clipboard.getString().catch(() => '');

    if (text.trim()) {
      reveal();
      handleChangePhrase(text.trim().split(/\s+/).join(' '));
    }
  };

  const handleSubmit = (): void => {
    if (!isValidMnemonic(phrase)) {
      setError('Check the words and their order.');
      return;
    }

    setMnemonic(normalizeMnemonic(phrase));
    navigation.navigate('SelectAccounts');
  };

  return (
    <ImportPhrasePage
      phrase={phrase}
      onChangePhrase={handleChangePhrase}
      onPaste={handlePaste}
      hidden={hidden}
      onReveal={reveal}
      error={error}
      onSubmit={handleSubmit}
      onBack={navigation.goBack}
    />
  );
};
