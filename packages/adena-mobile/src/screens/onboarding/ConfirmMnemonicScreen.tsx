import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {getCryptoProvider} from 'adena-module';
import React, {useMemo, useState} from 'react';

import {pendingSecret} from '../../core/pending-secret';
import type {OnboardingStackParams} from '../../navigation/types';
import {
  Body,
  Button,
  ErrorText,
  Field,
  Screen,
  Title,
} from '../../ui/components';

type Props = NativeStackScreenProps<OnboardingStackParams, 'ConfirmMnemonic'>;

const CHECKED_WORDS = 3;

/** Three distinct word positions, chosen with the CSPRNG (no Math.random). */
function pickPositions(wordCount: number): number[] {
  const positions = new Set<number>();
  while (positions.size < Math.min(CHECKED_WORDS, wordCount)) {
    const [byte] = getCryptoProvider().randomBytes(1);
    if (byte < 256 - (256 % wordCount)) {
      positions.add(byte % wordCount);
    }
  }
  return [...positions].sort((a, b) => a - b);
}

export function ConfirmMnemonicScreen({navigation}: Props) {
  const words = useMemo(
    () => pendingSecret.peekMnemonic()?.split(' ') ?? [],
    [],
  );
  const positions = useMemo(() => pickPositions(words.length), [words]);
  // Debug builds pre-fill the answers to speed up manual testing. Release
  // builds always make the user type them: this check is what proves the
  // phrase was actually written down.
  const [answers, setAnswers] = useState<string[]>(
    positions.map(position => (__DEV__ ? words[position] : '')),
  );
  const [error, setError] = useState('');

  const confirm = () => {
    const correct = positions.every(
      (position, index) =>
        answers[index].trim().toLowerCase() === words[position],
    );
    if (!correct) {
      setError('One or more words do not match. Check your written phrase.');
      return;
    }
    navigation.navigate('SetPassword');
  };

  if (words.length === 0) {
    return (
      <Screen>
        <Body>The recovery phrase is no longer available. Start again.</Body>
        <Button title="Back to start" onPress={() => navigation.popToTop()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Confirm your phrase</Title>
      <Body muted>
        Enter the words at these positions from what you wrote down.
      </Body>
      {positions.map((position, index) => (
        <Field
          key={position}
          label={`Word #${position + 1}`}
          value={answers[index]}
          onChangeText={text =>
            setAnswers(current =>
              current.map((value, i) => (i === index ? text : value)),
            )
          }
        />
      ))}
      <ErrorText>{error}</ErrorText>
      <Button
        title="Continue"
        disabled={answers.some(answer => !answer.trim())}
        onPress={confirm}
      />
    </Screen>
  );
}
