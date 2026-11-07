import {ADENA_TERMS_PAGE} from '@common/constants/resource.constant';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {Linking, StyleSheet, Switch, Text, View} from 'react-native';

import {
  isStrongEnoughPassword,
  passwordStrength,
  PasswordStrength,
} from '../../core/password-policy';
import {pendingSecret} from '../../core/pending-secret';
import {useWallet} from '../../core/wallet-context';
import type {OnboardingStackParams} from '../../navigation/types';
import {isBiometricUnlockAvailable} from '../../platform/biometric-unlock';
import {colorTokens} from '../../ui/theme';
import {
  WebButton,
  WebCheckBox,
  WebErrorText,
  WebInput,
  WebScreen,
  WebStepHeader,
  WebText,
  WebTitle,
} from '../../ui/web';
import {CREATE_FLOW_STEPS} from './CreateMnemonicScreen';
import {IMPORT_FLOW_STEPS} from './ImportWalletScreen';

type Props = NativeStackScreenProps<OnboardingStackParams, 'SetPassword'>;

const {webNeutral, webSuccess, webWarning, webError, webPrimary} = colorTokens;

const STRENGTH_COLOR: Record<PasswordStrength, string> = {
  Strong: webSuccess._100,
  Medium: webWarning._100,
  Weak: webError._100,
};

export function SetPasswordScreen({navigation, route}: Props) {
  const {createWallet, importPrivateKey, setBiometricUnlock} = useWallet();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [useBiometrics, setUseBiometrics] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [error, setError] = useState<{
    field: 'password' | 'confirm' | null;
    message: string;
  }>({field: null, message: ''});
  const [saving, setSaving] = useState(false);

  const steps =
    route.params?.flow === 'import' ? IMPORT_FLOW_STEPS : CREATE_FLOW_STEPS;
  const strength = passwordStrength(password);

  useEffect(() => {
    isBiometricUnlockAvailable()
      .then(setBiometricsAvailable)
      .catch(() => undefined);
  }, []);

  const submit = async () => {
    if (!isStrongEnoughPassword(password)) {
      setError({field: 'password', message: 'Password is too simple.'});
      return;
    }
    if (password !== confirm) {
      setError({field: 'confirm', message: 'Passwords do not match'});
      return;
    }
    const secret = pendingSecret.consume();
    if (!secret) {
      navigation.popToTop();
      return;
    }
    setSaving(true);
    try {
      if (secret.kind === 'mnemonic') {
        await createWallet(secret.value, password);
      } else {
        await importPrivateKey(secret.value, password);
      }
      if (useBiometrics) {
        await setBiometricUnlock(true, password);
      }
    } catch {
      setError({
        field: null,
        message: 'The wallet could not be saved. Try again.',
      });
      pendingSecret.set(secret);
    } finally {
      setSaving(false);
    }
  };

  return (
    <WebScreen
      header={
        <WebStepHeader
          step={steps - 1}
          steps={steps}
          onBack={() => navigation.goBack()}
        />
      }
      footer={
        <WebButton
          testID="password-save"
          title={saving ? 'Saving…' : 'Save'}
          chevron
          disabled={!agreed || !password || !confirm || saving}
          onPress={submit}
        />
      }>
      <WebTitle
        title="Create a Password"
        description="This will be used to unlock your wallet on this device. It cannot recover your wallet: only the seed phrase can."
      />
      <View style={styles.inputs}>
        <View style={styles.passwordRow}>
          <WebInput
            label="Password"
            secret
            value={password}
            error={error.field === 'password'}
            onChangeText={text => {
              setPassword(text);
              setError({field: null, message: ''});
            }}
            style={styles.flex}
          />
          {strength ? (
            <WebText type="body5" color={STRENGTH_COLOR[strength]}>
              {strength}
            </WebText>
          ) : null}
        </View>
        <WebInput
          label="Confirm Password"
          secret
          value={confirm}
          error={error.field === 'confirm'}
          onChangeText={text => {
            setConfirm(text);
            setError({field: null, message: ''});
          }}
        />
        <WebErrorText>{error.message}</WebErrorText>
      </View>
      {biometricsAvailable && (
        <View style={styles.biometrics}>
          <WebText type="body5" color={webNeutral._300}>
            Unlock with biometrics
          </WebText>
          <Switch
            value={useBiometrics}
            onValueChange={setUseBiometrics}
            trackColor={{true: webPrimary._100, false: webNeutral._800}}
          />
        </View>
      )}
      <WebCheckBox
        testID="password-terms"
        checked={agreed}
        onChange={setAgreed}
        label={
          <>
            I agree to the{' '}
            <Text
              accessibilityRole="link"
              style={styles.link}
              onPress={() => Linking.openURL(ADENA_TERMS_PAGE)}>
              Terms of Use
            </Text>
            .
          </>
        }
      />
    </WebScreen>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  inputs: {gap: 16},
  passwordRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  biometrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  link: {textDecorationLine: 'underline', color: webNeutral._300},
});
