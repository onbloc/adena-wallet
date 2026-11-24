import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { RecoveryPhrasePage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { AppErrorCode, isAppError } from '../../../core/errors';
import { useContainer } from '../../../di/container-provider';
import { useSensitiveClipboard } from '../../../hooks/use-sensitive-clipboard';
import { MainStackParamList } from '../../../navigation/types';
import { useBiometricStatusQuery } from '../../../queries/wallet.queries';
import { BiometryKind } from '../../../security/secure-store';
import { getBiometryLabel } from '../../../utils/biometry';

export const RecoveryPhraseScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'RecoveryPhrase'>): ReactElement => {
  const { walletService } = useContainer();
  const [password, setPassword] = useState('');
  const [words, setWords] = useState<string[]>();
  const [error, setError] = useState<string>();
  const [verifying, setVerifying] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  // Bumped on every hide so a reveal still in flight cannot show the phrase afterwards.
  const revealEpochRef = useRef(0);
  const clipboard = useSensitiveClipboard();
  const biometricStatus = useBiometricStatusQuery();
  const biometricLabel = biometricStatus.data?.enabled ? getBiometryLabel(biometricStatus.data.kind) : undefined;
  const { clear: clearClipboard } = clipboard;

  // Drop the revealed phrase when leaving the screen or the app stops being active (app switcher snapshot).
  // The clipboard hook handles app state on its own; FLAG_SECURE arrives with the native module work.
  useEffect(() => {
    const hideWords = (): void => {
      revealEpochRef.current += 1;
      setWords(undefined);
    };
    const unsubscribeBlur = navigation.addListener('blur', () => {
      hideWords();
      clearClipboard();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'inactive' || state === 'background') {
        hideWords();
      }
    });

    return (): void => {
      unsubscribeBlur();
      appState.remove();
    };
  }, [navigation, clearClipboard]);

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

  // Same epoch guard as the password reveal; a cancel or failure leaves the password field in place.
  const handleRevealWithBiometrics = async (): Promise<void> => {
    const epoch = revealEpochRef.current;

    if (verifying) {
      return;
    }

    setVerifying(true);

    try {
      const mnemonic = await walletService.revealMnemonicWithBiometrics(route.params.keyringId, { title: 'Show recovery phrase', cancel: 'Use password' });

      if (epoch !== revealEpochRef.current) {
        return;
      }

      setWords(mnemonic.split(' '));
      setPassword('');
      setSheetVisible(false);
    }
    catch (revealError) {
      if (!isAppError(revealError, AppErrorCode.BIOMETRICS_CANCELED)) {
        // A stale escrowed password (changed since biometrics were enabled) needs the typed one.
        setError(isAppError(revealError, AppErrorCode.INVALID_PASSWORD) ? 'Biometric password is out of date. Enter your password.' : toErrorMessage(revealError));
      }
    }
    finally {
      setVerifying(false);
    }
  };

  const handleCopy = (): void => {
    if (words) {
      clipboard.copy(words.join(' '), 'Recovery phrase copied. The clipboard clears in 60 seconds.');
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
      biometric={biometricLabel
        ? { label: biometricLabel, icon: biometricStatus.data?.kind === BiometryKind.FINGERPRINT ? 'fingerprint' : 'faceId', onPress: handleRevealWithBiometrics }
        : undefined}
      onCopy={handleCopy}
      onBack={navigation.goBack}
    />
  );
};
