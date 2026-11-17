import {isHDWalletKeyring} from 'adena-module';
import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {readSeedPhrase} from '../../core/seed-phrase';
import {checkPassword, passwordErrorMessage} from '../../core/unlock-throttle';
import {useWallet} from '../../core/wallet-context';
import {copySecret} from '../../security/sensitive-clipboard';
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

const NO_PHRASE =
  'This account was imported with a private key, so it has no seed phrase. Switch to an account created from a seed phrase.';

/**
 * The extension's Reveal Seed Phrase flow in one step: caution, password and
 * checklist, then a short hold shows the phrase. Biometrics alone are
 * not enough here, and the phrase comes from a separately decrypted copy that
 * is destroyed right away and dropped from memory on leave.
 *
 * The phrase shown is the one of the account selected in the app. The stored
 * vault's own current account can be a different one (switching accounts
 * does not re-save the vault), so it is not used.
 */
export function RevealMnemonicScreen() {
  const {screenshotTaken} = useSecureScreen();
  const {base, wallet, account} = useWallet();
  const keyringId = account?.keyringId;
  const hasPhrase = !!wallet?.keyrings.some(
    keyring => keyring.id === keyringId && isHDWalletKeyring(keyring),
  );
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
    let phrase: string | null = null;
    const checked = await checkPassword(async () => {
      const result = await readSeedPhrase(
        base.walletService,
        password,
        keyringId,
      );
      phrase = result.opened ? result.phrase : null;
      return result.opened;
    });
    setBusy(false);
    if (!checked.ok) {
      setError(
        checked.waitMs > 0
          ? passwordErrorMessage(checked.waitMs)
          : 'Invalid password',
      );
      return;
    }
    if (!phrase) {
      setError(NO_PHRASE);
      return;
    }
    setWords((phrase as string).split(' '));
    setRevealed(true);
    setPassword('');
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
              copySecret(words.join(' '));
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
          disabled={
            busy || !hasPhrase || !password || checks.some(checked => !checked)
          }
        />
      }>
      {!hasPhrase && <Notice tone="danger">{NO_PHRASE}</Notice>}
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
