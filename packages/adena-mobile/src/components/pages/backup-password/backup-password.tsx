import React, { ReactElement, useRef } from 'react';
import { TextInputInstance, View } from 'react-native';

import { useThemeColors } from '../../../theme';
import { Button, Icon, Text, TextColor } from '../../atoms';
import { InlineAlert, PageHeading, Screen, TextField, TopBar } from '../../molecules';
import { useStyles } from './backup-password.styles';

export interface BackupPasswordPageProps {
  // e.g. "iCloud" or "Google Drive".
  providerName: string;
  password: string;
  confirmPassword: string;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  strength?: { label: string; color: TextColor };
  passwordError?: string;
  confirmError?: string;
  onSubmit: () => void;
  onBack: () => void;
}

export const BackupPasswordPage = ({
  providerName,
  password,
  confirmPassword,
  onChangePassword,
  onChangeConfirmPassword,
  strength,
  passwordError,
  confirmError,
  onSubmit,
  onBack,
}: BackupPasswordPageProps): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();
  const confirmRef = useRef<TextInputInstance>(null);

  return (
    <Screen
      header={<TopBar onBack={onBack} />}
      footer={<Button label='Continue' disabled={!password || !confirmPassword} onPress={onSubmit} testID='backup-password-submit' />}
    >
      <PageHeading
        eyebrow={`Backup / ${providerName}`}
        title={'Create a backup\npassword.'}
        description={`You will need this password to restore your ${providerName} backup.`}
      />
      <TextField
        label='Backup password'
        value={password}
        onChangeText={onChangePassword}
        placeholder='Backup password'
        secure
        autoFocus
        returnKeyType='next'
        submitBehavior='submit'
        onSubmitEditing={() => confirmRef.current?.focus()}
        error={passwordError}
        helper={strength && !passwordError ? strength.label : undefined}
        testID='backup-password-input'
      />
      <TextField
        ref={confirmRef}
        label='Confirm backup password'
        value={confirmPassword}
        onChangeText={onChangeConfirmPassword}
        placeholder='Enter the password again'
        secure
        returnKeyType='done'
        onSubmitEditing={() => password && confirmPassword && onSubmit()}
        error={confirmError}
        testID='backup-password-confirm'
      />
      <InlineAlert tone='warning' title='Keep your password safe' description='Adena cannot recover it for you if you forget it.' />
      <View style={styles.provider}>
        <View style={styles.iconBox}>
          <Icon name='cloud' size={24} color={colors.icon.primary} />
        </View>
        <View style={styles.texts}>
          <Text variant='section'>{providerName}</Text>
          <Text variant='meta' color='secondary' style={styles.description}>Your recovery phrase is encrypted before backup.</Text>
        </View>
      </View>
    </Screen>
  );
};
