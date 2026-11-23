import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Text } from '../../atoms';
import { Screen, TextField } from '../../molecules';
import { styles } from './unlock.styles';

export interface UnlockPageProps {
  password: string;
  onChangePassword: (value: string) => void;
  error?: string;
  submitting: boolean;
  onUnlock: () => void;
  biometricLabel?: string;
  onBiometricUnlock?: () => void;
  onResetWallet: () => void;
}

export const UnlockPage = ({
  password,
  onChangePassword,
  error,
  submitting,
  onUnlock,
  biometricLabel,
  onBiometricUnlock,
  onResetWallet,
}: UnlockPageProps): ReactElement => (
  <Screen
    footer={(
      <>
        <Button label='Unlock' loadingLabel='Unlocking…' disabled={!password} loading={submitting} onPress={onUnlock} testID='unlock-submit' />
        {biometricLabel && onBiometricUnlock && (
          <Button label={`Use ${biometricLabel}`} tone='secondary' leadingIcon='faceId' onPress={onBiometricUnlock} />
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
      label='Password'
      value={password}
      onChangeText={onChangePassword}
      placeholder='Password'
      secure
      autoCapitalize='none'
      textContentType='password'
      onSubmitEditing={onUnlock}
      returnKeyType='done'
      error={error}
      testID='unlock-password'
    />
  </Screen>
);
