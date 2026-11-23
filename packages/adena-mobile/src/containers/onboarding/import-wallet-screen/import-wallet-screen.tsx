import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useState } from 'react';

import { ImportWalletPage } from '../../../components/pages';
import { isValidMnemonic, normalizeMnemonic } from '../../../crypto/mnemonic';
import { SecretImportMode } from '../../../domain/account';
import { OnboardingStackParamList } from '../../../navigation/types';
import { useOnboardingStore } from '../../../stores/onboarding.store';

export const ImportWalletScreen = ({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'ImportWallet'>): ReactElement => {
  const setMnemonic = useOnboardingStore(state => state.setMnemonic);
  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState<string>();

  const handleChangeSecret = (value: string): void => {
    setPhrase(value);
    setError(undefined);
  };

  const handleSubmit = (): void => {
    if (!isValidMnemonic(phrase)) {
      setError('Check the words and their order.');
      return;
    }

    setMnemonic(normalizeMnemonic(phrase));
    navigation.navigate('CreatePassword');
  };

  return (
    <ImportWalletPage
      mode={SecretImportMode.MNEMONIC}
      secret={phrase}
      onChangeSecret={handleChangeSecret}
      error={error}
      onSubmit={handleSubmit}
      onBack={navigation.goBack}
    />
  );
};
