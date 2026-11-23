import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useEffect, useState } from 'react';

import { RecoveryPhrasePage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { AppErrorCode, isAppError } from '../../../core/errors';
import { useContainer } from '../../../di/container-provider';
import { MainStackParamList } from '../../../navigation/types';

export const RecoveryPhraseScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'RecoveryPhrase'>): ReactElement => {
  const { walletService } = useContainer();
  const [password, setPassword] = useState('');
  const [words, setWords] = useState<string[]>();
  const [error, setError] = useState<string>();
  const [verifying, setVerifying] = useState(false);

  // Drop the revealed phrase from component state when leaving the screen.
  useEffect(() => navigation.addListener('blur', () => setWords(undefined)), [navigation]);

  const handleChangePassword = (value: string): void => {
    setPassword(value);
    setError(undefined);
  };

  const handleReveal = async (): Promise<void> => {
    setVerifying(true);

    try {
      const mnemonic = await walletService.revealMnemonic(route.params.keyringId, password);

      setWords(mnemonic.split(' '));
      setPassword('');
    }
    catch (revealError) {
      setError(isAppError(revealError, AppErrorCode.INVALID_PASSWORD) ? 'Incorrect password.' : toErrorMessage(revealError));
    }
    finally {
      setVerifying(false);
    }
  };

  return (
    <RecoveryPhrasePage
      words={words}
      password={password}
      onChangePassword={handleChangePassword}
      error={error}
      verifying={verifying}
      onReveal={handleReveal}
      onBack={navigation.goBack}
    />
  );
};
