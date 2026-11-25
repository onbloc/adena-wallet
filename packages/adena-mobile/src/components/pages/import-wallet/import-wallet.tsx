import React, { ReactElement, useRef } from 'react';
import { TextInputInstance, View } from 'react-native';

import { SecretImportMode } from '../../../domain/account';
import { Button, Text } from '../../atoms';
import { Screen, TextField, TopBar } from '../../molecules';
import { useStyles } from './import-wallet.styles';

export interface ImportWalletPageProps {
  title?: string;
  mode: SecretImportMode;
  secret: string;
  onChangeSecret: (value: string) => void;
  // Masked after the app left the foreground, so the app-switcher snapshot holds no secret.
  hidden?: boolean;
  onReveal?: () => void;
  accountName?: string;
  onChangeAccountName?: (value: string) => void;
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
  hidden = false,
  onReveal,
  accountName,
  onChangeAccountName,
  error,
  submitting = false,
  submitLabel = 'Continue',
  onSubmit,
  onBack,
}: ImportWalletPageProps): ReactElement => {
  const styles = useStyles();
  const accountNameRef = useRef<TextInputInstance>(null);
  const canSubmit = Boolean(secret.trim()) && !submitting;

  const handleSubmitEditing = (): void => {
    if (canSubmit) {
      onSubmit();
    }
  };

  const handleSecretSubmit = (): void => {
    if (onChangeAccountName) {
      accountNameRef.current?.focus();
      return;
    }

    handleSubmitEditing();
  };

  return (
    <Screen
      header={<TopBar title={title} onBack={onBack} />}
      footer={<Button label={submitLabel} disabled={!secret.trim()} loading={submitting} onPress={onSubmit} testID='import-submit' />}
    >
      <Text variant='body' color='secondary'>
        {mode === SecretImportMode.MNEMONIC ? 'Enter your 12 or 24 word recovery phrase, separated by spaces.' : 'Enter the 64 character hex private key.'}
      </Text>
      {hidden
        ? (
            <View style={styles.masked} testID='import-secret-masked'>
              <Text variant='body' color='secondary'>{mode === SecretImportMode.MNEMONIC ? 'Your recovery phrase is hidden.' : 'Your private key is hidden.'}</Text>
              <Button label='Show' tone='secondary' leadingIcon='eye' fullWidth={false} onPress={onReveal} testID='import-reveal' />
            </View>
          )
        : (
            <TextField
              label={mode === SecretImportMode.MNEMONIC ? 'Recovery phrase' : 'Private key'}
              value={secret}
              onChangeText={onChangeSecret}
              placeholder={mode === SecretImportMode.MNEMONIC ? 'word1 word2 word3 …' : '0x…'}
              multiline={mode === SecretImportMode.MNEMONIC}
              // Not masked: a secure field next to the account name reads as a login form to iOS ("Save Password?").
              sensitive
              // Words are space separated, so Return never inserts a newline in the phrase.
              returnKeyType={onChangeAccountName ? 'next' : 'done'}
              submitBehavior={onChangeAccountName ? 'submit' : 'blurAndSubmit'}
              onSubmitEditing={handleSecretSubmit}
              error={error}
              testID='import-secret'
            />
          )}
      {onChangeAccountName && (
        <TextField
          ref={accountNameRef}
          label='Account name'
          value={accountName}
          onChangeText={onChangeAccountName}
          placeholder='Account name'
          helper='Shown only on this device.'
          // Not a username: keeps the form from reading as a login to password managers.
          textContentType='none'
          autoComplete='off'
          importantForAutofill='no'
          returnKeyType='done'
          submitBehavior='blurAndSubmit'
          onSubmitEditing={handleSubmitEditing}
          testID='import-account-name'
        />
      )}
    </Screen>
  );
};
