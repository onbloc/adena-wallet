import Logo from '@assets/logo-withIcon.svg';
import RemoveIcon from '@assets/icon-remove-blur.svg';
import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {unlockThrottle} from '../core/unlock-throttle';
import {useWallet} from '../core/wallet-context';
import {Body, Button, ButtonPair, ErrorText, Field} from '../ui/components';
import {colors, fonts} from '../ui/theme';

/** The extension's login screen, plus its "Forgot Password?" reset path. */
export function UnlockScreen() {
  const {unlock, unlockWithBiometrics, biometricEnabled, resetWallet} =
    useWallet();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [waitMs, setWaitMs] = useState(0);
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    unlockThrottle.remainingMs().then(setWaitMs);
  }, []);

  useEffect(() => {
    if (waitMs <= 0) {
      return;
    }
    const timer = setTimeout(
      () => setWaitMs(ms => Math.max(0, ms - 1000)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [waitMs]);

  const tryBiometrics = useCallback(async () => {
    if (await unlockWithBiometrics()) {
      await unlockThrottle.reset();
    }
  }, [unlockWithBiometrics]);

  useEffect(() => {
    if (biometricEnabled) {
      tryBiometrics();
    }
  }, [biometricEnabled, tryBiometrics]);

  const submit = async () => {
    if ((await unlockThrottle.remainingMs()) > 0) {
      return;
    }
    setBusy(true);
    const ok = await unlock(password);
    setBusy(false);
    if (ok) {
      setPassword('');
      await unlockThrottle.reset();
      return;
    }
    const wait = await unlockThrottle.recordFailure();
    setWaitMs(wait);
    setError('The password is incorrect.');
  };

  if (forgot) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.resetBody}>
          <RemoveIcon width={100} height={100} />
          <Text style={styles.resetTitle}>Reset Wallet</Text>
          <Body muted center>
            Adena cannot recover your password for you. You can only reset your
            password with your seed phrase.
          </Body>
          <Body muted center>
            Resetting removes every account from this device. Without the seed
            phrase or private key, the funds cannot be recovered.
          </Body>
        </View>
        <View style={styles.footer}>
          <ButtonPair
            cancel={{title: 'Cancel', onPress: () => setForgot(false)}}
            confirm={{
              title: 'Reset',
              variant: 'danger',
              testID: 'unlock-reset',
              onPress: resetWallet,
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Logo width={82} height={17} />
      </View>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          {'Enter\nYour Password'}
        </Text>
        <Field
          label="Password"
          hideLabel
          placeholder="Password"
          secret
          autoFocus
          value={password}
          error={!!error}
          onChangeText={text => {
            setPassword(text);
            setError('');
          }}
          onSubmitEditing={submit}
          editable={waitMs === 0}
        />
        <ErrorText>{error}</ErrorText>
        {waitMs > 0 && (
          <Body muted>
            Too many attempts. Try again in {Math.ceil(waitMs / 1000)}s.
          </Body>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => setForgot(true)}
          style={styles.forgot}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </Pressable>
      </View>
      <View style={styles.footer}>
        {biometricEnabled && (
          <Button
            title="Use biometrics"
            variant="secondary"
            onPress={tryBiometrics}
          />
        )}
        <Button
          testID="unlock-submit"
          title="Unlock"
          onPress={submit}
          loading={busy}
          disabled={!password || waitMs > 0}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  header: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  body: {flex: 1, paddingHorizontal: 20, gap: 8},
  title: {
    ...fonts.header4,
    color: colors.text,
    marginTop: 54,
    marginBottom: 48,
  },
  forgot: {marginTop: 24, alignSelf: 'flex-start'},
  forgotText: {...fonts.body2Reg, color: colors.textMuted},
  footer: {paddingHorizontal: 20, paddingBottom: 24, gap: 10},
  resetBody: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    gap: 12,
  },
  resetTitle: {...fonts.header4, color: colors.text, marginTop: 11},
});
