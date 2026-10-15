import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {EnglishMnemonic} from 'adena-module';
import React, {useState} from 'react';
import {StyleSheet} from 'react-native';

import {pendingSecret} from '../../core/pending-secret';
import {normalizePrivateKey} from '../../core/private-key';
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

type ImportMode = 'mnemonic' | 'privateKey';

export function ImportWalletScreen({navigation}: Props) {
  useSecureScreen();
  const [mode, setMode] = useState<ImportMode>('mnemonic');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');

  const switchMode = (next: ImportMode) => {
    setMode(next);
    setSecret('');
    setError('');
  };

  const next = () => {
    if (mode === 'mnemonic') {
      const normalized = normalizeMnemonic(secret);
      if (!isValidMnemonic(normalized)) {
        setError(
          'This is not a valid recovery phrase. Check the words and their order.',
        );
        return;
      }
      pendingSecret.set({kind: 'mnemonic', value: normalized});
    } else {
      const privateKey = normalizePrivateKey(secret);
      if (!privateKey) {
        setError('A private key is 64 hexadecimal characters (0x optional).');
        return;
      }
      pendingSecret.set({kind: 'privateKey', value: privateKey});
    }
    setSecret('');
    navigation.navigate('SetPassword');
  };

  return (
    <Screen>
      <Title>Import a wallet</Title>
      <Button
        title="Recovery phrase"
        variant={mode === 'mnemonic' ? 'primary' : 'secondary'}
        onPress={() => switchMode('mnemonic')}
      />
      <Button
        title="Private key"
        variant={mode === 'privateKey' ? 'primary' : 'secondary'}
        onPress={() => switchMode('privateKey')}
      />
      <Body muted>
        {mode === 'mnemonic'
          ? 'Enter your 12 or 24 word recovery phrase, separated by spaces.'
          : 'Enter the private key of a single account. A wallet imported this way has only that account and no recovery phrase.'}
      </Body>
      <Notice>
        Only enter it here, in the Adena app you installed from the store.
      </Notice>
      {mode === 'mnemonic' ? (
        <Field
          label="Recovery phrase"
          value={secret}
          onChangeText={text => {
            setSecret(text);
            setError('');
          }}
          multiline
          style={styles.phrase}
        />
      ) : (
        <Field
          label="Private key"
          secret
          value={secret}
          onChangeText={text => {
            setSecret(text);
            setError('');
          }}
        />
      )}
      <ErrorText>{error}</ErrorText>
      <Button title="Continue" disabled={!secret.trim()} onPress={next} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  phrase: {minHeight: 120, textAlignVertical: 'top'},
});
