import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {Switch, View} from 'react-native';

import {isStrongEnoughPassword} from '../../core/password-policy';
import {pendingSecret} from '../../core/pending-secret';
import {useWallet} from '../../core/wallet-context';
import type {OnboardingStackParams} from '../../navigation/types';
import {isBiometricUnlockAvailable} from '../../platform/biometric-unlock';
import {
  Body,
  Button,
  ErrorText,
  Field,
  Row,
  Screen,
  Title,
} from '../../ui/components';

type Props = NativeStackScreenProps<OnboardingStackParams, 'SetPassword'>;

export function SetPasswordScreen({navigation}: Props) {
  const {createWallet, importPrivateKey, setBiometricUnlock} = useWallet();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [useBiometrics, setUseBiometrics] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    isBiometricUnlockAvailable()
      .then(setBiometricsAvailable)
      .catch(() => undefined);
  }, []);

  const submit = async () => {
    if (!isStrongEnoughPassword(password)) {
      setError('The password is too weak.');
      return;
    }
    if (password !== confirm) {
      setError('The passwords do not match.');
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
      setError('The wallet could not be saved. Try again.');
      pendingSecret.set(secret);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Title>Set a password</Title>
      <Body muted>
        It unlocks Adena on this device. It cannot recover your wallet; only the
        recovery phrase can.
      </Body>
      <Field
        label="Password"
        secret
        value={password}
        onChangeText={setPassword}
      />
      <Field
        label="Confirm password"
        secret
        value={confirm}
        onChangeText={setConfirm}
      />
      {biometricsAvailable && (
        <Row
          label="Unlock with biometrics"
          value={
            <Switch value={useBiometrics} onValueChange={setUseBiometrics} />
          }
        />
      )}
      <ErrorText>{error}</ErrorText>
      <View>
        <Button
          title="Create wallet"
          onPress={submit}
          loading={saving}
          disabled={!password || !confirm}
        />
      </View>
    </Screen>
  );
}
