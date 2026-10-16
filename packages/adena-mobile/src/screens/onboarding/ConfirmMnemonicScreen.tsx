import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {getCryptoProvider} from 'adena-module';
import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {pendingSecret} from '../../core/pending-secret';
import type {OnboardingStackParams} from '../../navigation/types';
import {
  SeedWordInput,
  WebButton,
  WebErrorText,
  WebScreen,
  WebStepHeader,
  WebText,
  WebTitle,
} from '../../ui/web';
import {CREATE_FLOW_STEPS} from './CreateMnemonicScreen';

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
  const [wrong, setWrong] = useState<boolean[]>(positions.map(() => false));

  const confirm = () => {
    const mismatches = positions.map(
      (position, index) =>
        answers[index].trim().toLowerCase() !== words[position],
    );
    setWrong(mismatches);
    if (mismatches.some(Boolean)) {
      return;
    }
    navigation.navigate('SetPassword', {flow: 'create'});
  };

  const header = (
    <WebStepHeader
      step={3}
      steps={CREATE_FLOW_STEPS}
      onBack={() => navigation.goBack()}
    />
  );

  if (words.length === 0) {
    return (
      <WebScreen
        header={header}
        footer={
          <WebButton
            title="Back to start"
            onPress={() => navigation.popToTop()}
          />
        }>
        <WebText type="body4">
          The seed phrase is no longer available. Start again.
        </WebText>
      </WebScreen>
    );
  }

  return (
    <WebScreen
      header={header}
      footer={
        <WebButton
          testID="confirm-next"
          title="Next"
          chevron
          disabled={answers.some(answer => !answer.trim())}
          onPress={confirm}
        />
      }>
      <WebTitle
        title="Verify Your Seed Phrase"
        description="Enter the requested words from your seed phrase in the fields below."
      />
      <View style={styles.inputs}>
        {positions.map((position, index) => (
          <SeedWordInput
            key={position}
            label={`Word #${position + 1}`}
            error={wrong[index]}
            value={answers[index]}
            onChangeText={text => {
              setAnswers(current =>
                current.map((value, i) => (i === index ? text : value)),
              );
              setWrong(current =>
                current.map((value, i) => (i === index ? false : value)),
              );
            }}
          />
        ))}
      </View>
      <WebErrorText>
        {wrong.some(Boolean)
          ? 'One or more words do not match. Check your written phrase.'
          : ''}
      </WebErrorText>
    </WebScreen>
  );
}

const styles = StyleSheet.create({
  inputs: {gap: 16},
});
