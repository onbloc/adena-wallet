import React, { ReactElement } from 'react';

import { SecretImportMode } from '../../../domain/account';
import { Button, Text } from '../../atoms';
import { Screen, TextField, TopBar } from '../../molecules';

export interface ImportWalletPageProps {
  title?: string;
  mode: SecretImportMode;
  secret: string;
  onChangeSecret: (value: string) => void;
  accountName?: string;
  onChangeAccountName?: (value: string) => void;
  // Required when adding a keyring to an existing wallet.
  password?: string;
  onChangePassword?: (value: string) => void;
  error?: string;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: () => void;
  onBack: () => void;
}

export const ImportWalletPage = ({
  title = 'Import wallet',
  mode,
  secret,
  onChangeSecret,
  accountName,
  onChangeAccountName,
  password,
  onChangePassword,
  error,
  submitting = false,
  submitLabel = 'Continue',
  onSubmit,
  onBack,
}: ImportWalletPageProps): ReactElement => (
  <Screen
    header={<TopBar title={title} onBack={onBack} />}
    footer={<Button label={submitLabel} disabled={!secret.trim() || (onChangePassword !== undefined && !password)} loading={submitting} onPress={onSubmit} testID='import-submit' />}
  >
    <Text variant='body' color='secondary'>
      {mode === SecretImportMode.MNEMONIC ? 'Enter your 12 or 24 word recovery phrase, separated by spaces.' : 'Enter the 64 character hex private key.'}
    </Text>
    <TextField
      label={mode === SecretImportMode.MNEMONIC ? 'Recovery phrase' : 'Private key'}
      value={secret}
      onChangeText={onChangeSecret}
      placeholder={mode === SecretImportMode.MNEMONIC ? 'word1 word2 word3 …' : '0x…'}
      multiline={mode === SecretImportMode.MNEMONIC}
      secure={mode === SecretImportMode.PRIVATE_KEY}
      autoCapitalize='none'
      autoCorrect={false}
      autoComplete='off'
      importantForAutofill='no'
      error={error}
      testID='import-secret'
    />
    {onChangeAccountName && (
      <TextField label='Account name' value={accountName} onChangeText={onChangeAccountName} placeholder='Account name' helper='Shown only on this device.' />
    )}
    {onChangePassword && (
      <TextField label='Wallet password' value={password} onChangeText={onChangePassword} placeholder='Password' secure autoCapitalize='none' />
    )}
  </Screen>
);
