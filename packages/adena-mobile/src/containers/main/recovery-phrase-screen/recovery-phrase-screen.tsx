import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { isCoveredBySheet } from '../../../components/molecules';
import { RecoveryPhrasePage } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { usePasswordGate } from '../../../hooks/use-password-gate';
import { useSensitiveClipboard } from '../../../hooks/use-sensitive-clipboard';
import { MainStackParamList } from '../../../navigation/types';
import { useSessionStore } from '../../../stores/session.store';

export const RecoveryPhraseScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'RecoveryPhrase'>): ReactElement => {
  const { walletService, backupReminder } = useContainer();
  const bumpRevision = useSessionStore(state => state.bumpRevision);
  const [words, setWords] = useState<string[]>();
  // Bumped on every hide so a reveal still in flight cannot show the phrase afterwards.
  const revealEpochRef = useRef(0);
  const clipboard = useSensitiveClipboard();
  const { clear: clearClipboard } = clipboard;

  const reveal = usePasswordGate(async (password) => {
    const epoch = revealEpochRef.current;
    const mnemonic = await walletService.revealMnemonic(route.params.keyringId, password);

    if (epoch === revealEpochRef.current) {
      setWords(mnemonic.split(' '));
      // Seen once, the phrase counts as backed up and Home stops asking.
      backupReminder.clear(route.params.keyringId);
      bumpRevision();
    }
  }, { prompt: { title: 'Show recovery phrase', cancel: 'Use password' } });
  const { onClose: closeRevealSheet } = reveal.sheetProps;

  // Drop the revealed phrase when leaving the screen or the app stops being active (app switcher snapshot).
  // The clipboard hook handles app state (and the native sensitive copy) on its own; FLAG_SECURE and the
  // iOS privacy cover protect every window app-wide.
  useEffect(() => {
    const hideWords = (): void => {
      revealEpochRef.current += 1;
      setWords(undefined);
    };
    const unsubscribeBlur = navigation.addListener('blur', () => {
      // The password sheet is a route over this screen, not a departure from it.
      if (isCoveredBySheet(navigation)) {
        return;
      }

      hideWords();
      closeRevealSheet();
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
  }, [navigation, clearClipboard, closeRevealSheet]);

  const handleCopy = (): void => {
    if (words) {
      clipboard.copy(
        words.join(' '),
        clipboard.outlivesBackground
          ? 'Recovery phrase copied. The clipboard clears in 60 seconds.'
          : 'Recovery phrase copied. The clipboard clears in 60 seconds or when you leave Adena.',
      );
    }
  };

  return (
    <RecoveryPhrasePage
      words={words}
      onOpenPasswordSheet={reveal.open}
      passwordSheet={reveal.sheetProps}
      onCopy={handleCopy}
      onBack={navigation.goBack}
    />
  );
};
