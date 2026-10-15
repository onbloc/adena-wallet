import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useWallet} from '../../core/wallet-context';
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
import {colors, radius, spacing} from '../../ui/theme';

/**
 * Re-asks for the password (biometrics alone are not enough here), then shows
 * the phrase from a separately decrypted copy that is destroyed on leave.
 */
export function RevealMnemonicScreen() {
  const {screenshotTaken} = useSecureScreen();
  const {base} = useWallet();
  const [password, setPassword] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => () => setWords([]), []);

  const reveal = async () => {
    setBusy(true);
    try {
      const copy = await base.walletService.deserializeWallet(password);
      try {
        setWords(copy.getMnemonic().split(' '));
      } finally {
        copy.destroy();
      }
      setPassword('');
    } catch {
      setError('The password is incorrect.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Title>Recovery phrase</Title>
      <Notice tone="danger">
        Anyone with this phrase controls your funds. Adena support will never
        ask for it. Make sure no one can see your screen.
      </Notice>
      {screenshotTaken && (
        <Notice tone="danger">
          A screenshot was taken. Delete it from your photos and cloud backup.
        </Notice>
      )}
      {words.length === 0 ? (
        <>
          <Field
            label="Wallet password"
            secret
            value={password}
            onChangeText={setPassword}
          />
          <ErrorText>{error}</ErrorText>
          <Button
            title="Show phrase"
            onPress={reveal}
            loading={busy}
            disabled={!password}
          />
        </>
      ) : (
        <>
          <View style={styles.grid}>
            {words.map((word, index) => (
              <View key={`${index}-${word}`} style={styles.cell}>
                <Text style={styles.index}>{index + 1}</Text>
                <Text style={styles.word}>{word}</Text>
              </View>
            ))}
          </View>
          <Body muted>The phrase disappears when you leave this screen.</Body>
          <Button
            title="Hide"
            variant="secondary"
            onPress={() => setWords([])}
          />
        </>
      )}
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
    padding: spacing.sm,
  },
  index: {color: colors.textMuted, fontSize: 13, minWidth: 18},
  word: {color: colors.text, fontSize: 14, fontWeight: '600'},
});
