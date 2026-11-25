import React, { ReactElement, RefObject } from 'react';
import { TextInputInstance, View } from 'react-native';

import { Button, IconName, Text } from '../../atoms';
import { Screen, TextField } from '../../molecules';
import { styles } from './unlock.styles';

export interface UnlockPageProps {
  password: string;
  onChangePassword: (value: string) => void;
  error?: string;
  submitting: boolean;
  onUnlock: () => void;
  biometricLabel?: string;
  biometricIcon?: IconName;
  onBiometricUnlock?: () => void;
  onResetWallet: () => void;
  // Focused by the screen when biometrics are off or fall back to the password.
  passwordRef?: RefObject<TextInputInstance | null>;
}

export const UnlockPage = ({
  password,
  onChangePassword,
  error,
  submitting,
  onUnlock,
  biometricLabel,
  biometricIcon = 'faceId',
  onBiometricUnlock,
  onResetWallet,
  passwordRef,
}: UnlockPageProps): ReactElement => (
  <Screen
    footer={(
      <>
        <Button label='Unlock' loadingLabel='Unlocking…' disabled={!password} loading={submitting} onPress={onUnlock} testID='unlock-submit' />
        {biometricLabel && onBiometricUnlock && (
          <Button label={`Use ${biometricLabel}`} tone='secondary' leadingIcon={biometricIcon} disabled={submitting} onPress={onBiometricUnlock} />
        )}
        <Button label='Forgot password? Reset wallet' tone='tertiary' size='compact' onPress={onResetWallet} />
      </>
    )}
  >
    <View style={styles.hero}>
      <Text variant='display'>Adena</Text>
      <Text variant='body' color='secondary'>Enter your password to unlock.</Text>
    </View>
    <TextField
      ref={passwordRef}
      label='Password'
      value={password}
      onChangeText={onChangePassword}
      placeholder='Password'
      secure
      onSubmitEditing={onUnlock}
      returnKeyType='go'
      submitBehavior='submit'
      error={error}
      testID='unlock-password'
    />
  </Screen>
);
