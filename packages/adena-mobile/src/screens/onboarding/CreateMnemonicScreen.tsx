import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AdenaWallet} from 'adena-module';
import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {pendingSecret} from '../../core/pending-secret';
import type {OnboardingStackParams} from '../../navigation/types';
import {useSecureScreen} from '../../security/use-secure-screen';
import {Body, Button, Notice, Screen, Title} from '../../ui/components';
import {colors, radius, spacing} from '../../ui/theme';

type Props = NativeStackScreenProps<OnboardingStackParams, 'CreateMnemonic'>;

// 24 words = 256 bits of entropy from the native CSPRNG (via CryptoProvider).
const WORD_COUNT = 24;

export function CreateMnemonicScreen({navigation}: Props) {
  const {screenshotTaken} = useSecureScreen();
  const [words, setWords] = useState<string[]>([]);

  useEffect(() => {
    const mnemonic = AdenaWallet.generateMnemonic(WORD_COUNT);
    pendingSecret.set({kind: 'mnemonic', value: mnemonic});
    setWords(mnemonic.split(' '));
    return () => setWords([]);
  }, []);

  return (
    <Screen>
      <Title>Your recovery phrase</Title>
      <Body muted>
        Write these {WORD_COUNT} words on paper, in order, and keep it offline.
        It is the only way to recover this wallet.
      </Body>
      {screenshotTaken ? (
        <Notice tone="danger">
          A screenshot was taken. Delete it from your photos and any cloud
          backup: apps that read your gallery can steal the phrase. Consider
          creating a new wallet.
        </Notice>
      ) : (
        <Notice>
          Do not take a screenshot or store the phrase in a notes or cloud app.
        </Notice>
      )}
      <View style={styles.grid}>
        {words.map((word, index) => (
          <View key={`${index}-${word}`} style={styles.cell}>
            <Text style={styles.index}>{index + 1}</Text>
            <Text style={styles.word}>{word}</Text>
          </View>
        ))}
      </View>
      <Button
        title="I wrote it down"
        disabled={words.length === 0}
        onPress={() => navigation.navigate('ConfirmMnemonic')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  cell: {
    width: '31%',
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  index: {color: colors.textMuted, fontSize: 13, minWidth: 18},
  word: {color: colors.text, fontSize: 14, fontWeight: '600'},
});
