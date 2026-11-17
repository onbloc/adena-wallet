import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useEffect, useState} from 'react';
import {Switch} from 'react-native';

import {useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {effectiveAutoLockMinutes} from '../../platform/auto-lock';
import {isBiometricUnlockAvailable} from '../../platform/biometric-unlock';
import {Button, ErrorText, Field, ListItem, Screen} from '../../ui/components';
import {colors, colorTokens} from '../../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'Security'>;

/** The popup's Security & Privacy menu, plus the mobile biometric switch. */
export function SecurityScreen({navigation}: Props) {
  const {base, biometricEnabled, setBiometricUnlock} = useWallet();
  const [autoLock, setAutoLock] = useState<number | null>(null);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [enablingBiometrics, setEnablingBiometrics] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      base.walletService
        .getAutoLockTimeoutMinutes()
        .then(minutes => setAutoLock(effectiveAutoLockMinutes(minutes)));
    }, [base]),
  );

  useEffect(() => {
    isBiometricUnlockAvailable()
      .then(setBiometricsAvailable)
      .catch(() => undefined);
  }, []);

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
      <ListItem
        title="Change Password"
        onPress={() => navigation.navigate('ChangePassword')}
      />
      <ListItem
        title="Auto-Lock Timer"
        detail={autoLock === null ? undefined : `${autoLock} min`}
        onPress={() => navigation.navigate('AutoLock')}
      />
      {biometricsAvailable && (
        <ListItem
          title="Unlock with Biometrics"
          trailing={
            <Switch
              value={biometricEnabled || enablingBiometrics}
              onValueChange={on =>
                on ? setEnablingBiometrics(true) : setBiometricUnlock(false)
              }
              trackColor={{
                true: colors.primary,
                false: colorTokens.neutral.b,
              }}
            />
          }
        />
      )}
      {enablingBiometrics && !biometricEnabled && (
        <>
          <Field
            label="Wallet password"
            hideLabel
            placeholder="Password"
            secret
            value={password}
            error={!!error}
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
      <ListItem
        title="Reveal Seed Phrase"
        onPress={() => navigation.navigate('RevealMnemonic')}
      />
      <ListItem
        testID="security-reset"
        title="Reset Wallet"
        danger
        onPress={() => navigation.navigate('ResetWallet')}
      />
    </Screen>
  );
}
