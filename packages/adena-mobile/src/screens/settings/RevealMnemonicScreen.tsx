import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useWallet} from '../../core/wallet-context';
import {
  copyWithExpiry,
  SECRET_CLIPBOARD_CLEAR_MS,
} from '../../security/sensitive-clipboard';
import {useSecureScreen} from '../../security/use-secure-screen';
import {COPIED_WARNING} from '../onboarding/CreateMnemonicScreen';
import {
  Body,
  ErrorText,
  Field,
  Notice,
  Screen,
} from '../../ui/components';
import {colors, colorTokens, fonts} from '../../ui/theme';
import {
  HoldToReveal,
  SeedGrid,
  WebCheckBox,
  WebCopyButton,
  WebHoldButton,
} from '../../ui/web';

/**
 * The extension's Reveal Seed Phrase flow in one step: caution, password and
 * checklist, then a short hold shows the phrase. Biometrics alone are
 * not enough here, and the phrase comes from a separately decrypted copy that
 * is destroyed right away and dropped from memory on leave.
 */
export function RevealMnemonicScreen() {
  const {screenshotTaken} = useSecureScreen();
  const {base} = useWallet();
  const [password, setPassword] = useState('');
  const [checks, setChecks] = useState([false, false]);
  const [words, setWords] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => () => setWords([]), []);

  const next = async () => {
    setBusy(true);
    try {
      const copy = await base.walletService.deserializeWallet(password);
      try {
        setWords(copy.getMnemonic().split(' '));
        setRevealed(true);
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
        {copied && <Notice tone="danger">{COPIED_WARNING}</Notice>}
        <View style={styles.actions}>
          <HoldToReveal revealed={revealed} onChange={setRevealed} />
          <WebCopyButton
            testID="reveal-copy"
            onCopy={() => {
              copyWithExpiry(words.join(' '), SECRET_CLIPBOARD_CLEAR_MS);
              setCopied(true);
            }}
          />
        </View>
        <Body muted>The phrase disappears when you leave this screen.</Body>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <WebHoldButton
          testID="reveal-hold"
          title={busy ? 'Checking…' : 'Hold to Reveal Seed Phrase'}
          onComplete={next}
          disabled={busy || !password || checks.some(checked => !checked)}
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
  actions: {flexDirection: 'row', justifyContent: 'center', gap: 12},
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
