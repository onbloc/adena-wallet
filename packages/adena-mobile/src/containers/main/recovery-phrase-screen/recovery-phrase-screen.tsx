import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

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
  const [sheetVisible, setSheetVisible] = useState(false);
  // Bumped on every hide so a reveal still in flight cannot show the phrase afterwards.
  const revealEpochRef = useRef(0);

  // Drop the revealed phrase when leaving the screen or the app goes to the background.
  useEffect(() => {
    const hide = (): void => {
      revealEpochRef.current += 1;
      setWords(undefined);
    };
    const unsubscribeBlur = navigation.addListener('blur', hide);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        hide();
      }
    });

    return (): void => {
      unsubscribeBlur();
      appState.remove();
    };
  }, [navigation]);

  const handleChangePassword = (value: string): void => {
    setPassword(value);
    setError(undefined);
  };

  const handleReveal = async (): Promise<void> => {
    const epoch = revealEpochRef.current;

    setVerifying(true);

    try {
      const mnemonic = await walletService.revealMnemonic(route.params.keyringId, password);

      if (epoch !== revealEpochRef.current) {
        return;
      }

      setWords(mnemonic.split(' '));
      setPassword('');
      setSheetVisible(false);
    }
    catch (revealError) {
      setError(isAppError(revealError, AppErrorCode.INVALID_PASSWORD) ? 'Incorrect password.' : toErrorMessage(revealError));
    }
    finally {
      setVerifying(false);
    }
  };

  const handleOpenPasswordSheet = (): void => setSheetVisible(true);

  const handleClosePasswordSheet = (): void => {
    setSheetVisible(false);
    setPassword('');
    setError(undefined);
  };

  return (
    <RecoveryPhrasePage
      words={words}
      passwordSheetVisible={sheetVisible}
      onOpenPasswordSheet={handleOpenPasswordSheet}
      onClosePasswordSheet={handleClosePasswordSheet}
      password={password}
      onChangePassword={handleChangePassword}
      error={error}
      verifying={verifying}
      onReveal={handleReveal}
      onBack={navigation.goBack}
    />
  );
};
