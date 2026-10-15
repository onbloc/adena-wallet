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
} from '../../ui/components';
import {colors, colorTokens, fonts} from '../../ui/theme';
import {HoldToReveal, SeedGrid, WebCheckBox} from '../../ui/web';

/**
 * The extension's Reveal Seed Phrase flow: caution, password and checklist,
 * then the phrase masked behind Hold to Reveal. Biometrics alone are not
 * enough here, and the phrase comes from a separately decrypted copy that is
 * destroyed right away and dropped from memory on leave.
 */
export function RevealMnemonicScreen() {
  const {screenshotTaken} = useSecureScreen();
  const {base} = useWallet();
  const [password, setPassword] = useState('');
  const [checks, setChecks] = useState([false, false]);
  const [words, setWords] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => () => setWords([]), []);

  const next = async () => {
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
      setError('Invalid password');
    } finally {
      setBusy(false);
    }
  };

  if (words.length > 0) {
    return (
      <Screen>
        <Notice tone="danger">
          Your seed phrase is the only way to recover your wallet. Keep it
          somewhere safe and secret.
        </Notice>
        {screenshotTaken && (
          <Notice tone="danger">
            A screenshot was taken. Delete it from your photos and cloud backup.
          </Notice>
        )}
        <SeedGrid words={words} hidden={!revealed} />
        <View style={styles.center}>
          <HoldToReveal revealed={revealed} onChange={setRevealed} />
        </View>
        <Body muted>The phrase disappears when you leave this screen.</Body>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          title="Next"
          onPress={next}
          loading={busy}
          disabled={!password || checks.some(checked => !checked)}
        />
      }>
      <View style={styles.caution}>
        <Text style={styles.cautionTitle}>Approach with caution!</Text>
        <Text style={styles.cautionBody}>
          You’re about to reveal your seed phrase. Make sure no one can see your
          screen, and review the checklist below.
        </Text>
      </View>
      <Field
        label="Password"
        hideLabel
        placeholder="Password"
        secret
        value={password}
        error={!!error}
        onChangeText={text => {
          setPassword(text);
          setError('');
        }}
      />
      <ErrorText>{error}</ErrorText>
      {[
        'Anyone with the phrase will have full control over my funds.',
        'I will never share my seed phrase with anyone.',
      ].map((label, index) => (
        <WebCheckBox
          key={label}
          checked={checks[index]}
          onChange={checked =>
            setChecks(current =>
              current.map((value, i) => (i === index ? checked : value)),
            )
          }
          label={label}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {alignItems: 'center'},
  caution: {
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(231, 50, 59, 0.1)',
  },
  cautionTitle: {...fonts.header7, color: colorTokens.red.a},
  cautionBody: {...fonts.body2Reg, color: colors.danger},
});
