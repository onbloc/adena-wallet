import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {EnglishMnemonic} from 'adena-module';
import React, {useState} from 'react';
import {StyleSheet} from 'react-native';

import {pendingMnemonic} from '../../core/pending-mnemonic';
import type {OnboardingStackParams} from '../../navigation/types';
import {useSecureScreen} from '../../security/use-secure-screen';
import {
  Body,
  Button,
  ErrorText,
  Field,
  Notice,
  Screen,
  Title,
} from '../../ui/components';

type Props = NativeStackScreenProps<OnboardingStackParams, 'ImportWallet'>;

/** Word count, wordlist membership and checksum, via adena-module's BIP39 code. */
export function isValidMnemonic(mnemonic: string): boolean {
  try {
    return new EnglishMnemonic(mnemonic).toString() === mnemonic;
  } catch {
    return false;
  }
}

export function normalizeMnemonic(input: string): string {
  return input.trim().toLowerCase().split(/\s+/).join(' ');
}

export function ImportWalletScreen({navigation}: Props) {
  useSecureScreen();
  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState('');

  const next = () => {
    const normalized = normalizeMnemonic(phrase);
    if (!isValidMnemonic(normalized)) {
      setError(
        'This is not a valid recovery phrase. Check the words and their order.',
      );
      return;
    }
    pendingMnemonic.set(normalized);
    setPhrase('');
    navigation.navigate('SetPassword');
  };

  return (
    <Screen>
      <Title>Import a wallet</Title>
      <Body muted>
        Enter your 12 or 24 word recovery phrase, separated by spaces.
      </Body>
      <Notice>
        Only enter your phrase here, in the Adena app you installed from the
        store.
      </Notice>
      <Field
        label="Recovery phrase"
        value={phrase}
        onChangeText={text => {
          setPhrase(text);
          setError('');
        }}
        multiline
        style={styles.phrase}
      />
      <ErrorText>{error}</ErrorText>
      <Button title="Continue" disabled={!phrase.trim()} onPress={next} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  phrase: {minHeight: 120, textAlignVertical: 'top'},
});
