import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {Switch} from 'react-native';

import {useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {
  effectiveAutoLockMinutes,
  MAX_AUTO_LOCK_MINUTES,
} from '../../platform/auto-lock';
import {isBiometricUnlockAvailable} from '../../platform/biometric-unlock';
import {
  Body,
  Button,
  Card,
  ErrorText,
  Field,
  Notice,
  Row,
  Screen,
  Title,
} from '../../ui/components';

type Props = NativeStackScreenProps<MainStackParams, 'Settings'>;

const AUTO_LOCK_CHOICES = [1, 5, MAX_AUTO_LOCK_MINUTES];
const RESET_CONFIRMATION = 'RESET';

export function SettingsScreen({navigation}: Props) {
  const {base, net, biometricEnabled, setBiometricUnlock, resetWallet, lock} =
    useWallet();
  const [autoLock, setAutoLock] = useState<number | null>(null);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [enablingBiometrics, setEnablingBiometrics] = useState(false);
  const [password, setPassword] = useState('');
  const [resetText, setResetText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    base.walletService
      .getAutoLockTimeoutMinutes()
      .then(minutes => setAutoLock(effectiveAutoLockMinutes(minutes)));
    isBiometricUnlockAvailable()
      .then(setBiometricsAvailable)
      .catch(() => undefined);
  }, [base]);

  const chooseAutoLock = async (minutes: number) => {
    await base.walletService.updateAutoLockTimeoutMinutes(minutes);
    setAutoLock(minutes);
  };

  const confirmBiometrics = async () => {
    try {
      await setBiometricUnlock(true, password);
      setEnablingBiometrics(false);
      setPassword('');
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Screen>
      <Title>Settings</Title>
      <Card>
        <Row label="Network" value={net?.network.networkName ?? ''} />
        <Button
          title="Change network"
          variant="secondary"
          onPress={() => navigation.navigate('Networks')}
        />
      </Card>

      <Card>
        <Body>Auto-lock</Body>
        {AUTO_LOCK_CHOICES.map(minutes => (
          <Button
            key={minutes}
            title={`${minutes} min${autoLock === minutes ? ' (current)' : ''}`}
            variant={autoLock === minutes ? 'primary' : 'secondary'}
            onPress={() => chooseAutoLock(minutes)}
          />
        ))}
      </Card>

      {biometricsAvailable && (
        <Card>
          <Row
            label="Unlock with biometrics"
            value={
              <Switch
                value={biometricEnabled || enablingBiometrics}
                onValueChange={on =>
                  on ? setEnablingBiometrics(true) : setBiometricUnlock(false)
                }
              />
            }
          />
          {enablingBiometrics && !biometricEnabled && (
            <>
              <Field
                label="Wallet password"
                secret
                value={password}
                onChangeText={setPassword}
              />
              <ErrorText>{error}</ErrorText>
              <Button
                title="Enable"
                onPress={confirmBiometrics}
                disabled={!password}
              />
            </>
          )}
        </Card>
      )}

      <Card>
        <Button
          title="Change password"
          variant="secondary"
          onPress={() => navigation.navigate('ChangePassword')}
        />
        <Button
          title="Show recovery phrase"
          variant="secondary"
          onPress={() => navigation.navigate('RevealMnemonic')}
        />
        <Button title="Lock now" variant="secondary" onPress={lock} />
      </Card>

      <Card>
        <Notice tone="danger">
          Resetting deletes this wallet from the device. Without the recovery
          phrase, the funds cannot be recovered.
        </Notice>
        <Field
          label={`Type ${RESET_CONFIRMATION} to confirm`}
          value={resetText}
          onChangeText={setResetText}
        />
        <Button
          title="Reset wallet"
          variant="danger"
          disabled={resetText !== RESET_CONFIRMATION}
          onPress={resetWallet}
        />
      </Card>
    </Screen>
  );
}
