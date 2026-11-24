import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useRef, useState } from 'react';
import { Keyboard } from 'react-native';

import { ImportWalletPage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { SecretImportMode } from '../../../domain/account';
import { MainStackParamList } from '../../../navigation/types';
import { useSessionStore } from '../../../stores/session.store';
import { useToastStore } from '../../../stores/toast.store';

// The wallet is unlocked here, so the vault is updated with the session key and no password is asked.
export const ImportAccountScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'ImportAccount'>): ReactElement => {
  const { mode } = route.params;
  const { walletService } = useContainer();
  const bumpRevision = useSessionStore(state => state.bumpRevision);
  const showToast = useToastStore(state => state.show);
  const [secret, setSecret] = useState('');
  const [accountName, setAccountName] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const submit = async (): Promise<void> => {
    if (!secret.trim() || submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError(undefined);
    Keyboard.dismiss();

    try {
      const account = mode === SecretImportMode.MNEMONIC
        ? await walletService.addMnemonicKeyring(secret, accountName)
        : await walletService.importPrivateKey(secret, accountName);

      bumpRevision();
      showToast(`${account.name} imported`, 'success');
      navigation.popToTop();
    }
    catch (submitError) {
      setError(toErrorMessage(submitError));
    }
    finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleChangeSecret = (value: string): void => {
    setSecret(value);
    setError(undefined);
  };

  return (
    <ImportWalletPage
      title={mode === SecretImportMode.MNEMONIC ? 'Import recovery phrase' : 'Import private key'}
      mode={mode}
      secret={secret}
      onChangeSecret={handleChangeSecret}
      accountName={accountName}
      onChangeAccountName={setAccountName}
      error={error}
      submitting={submitting}
      submitLabel='Import'
      onSubmit={submit}
      onBack={navigation.goBack}
    />
  );
};
