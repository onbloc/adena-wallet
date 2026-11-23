import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useState } from 'react';

import { ImportWalletPage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { AppErrorCode, isAppError } from '../../../core/errors';
import { useContainer } from '../../../di/container-provider';
import { SecretImportMode } from '../../../domain/account';
import { MainStackParamList } from '../../../navigation/types';
import { useSessionStore } from '../../../stores/session.store';
import { useToastStore } from '../../../stores/toast.store';

export const ImportAccountScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'ImportAccount'>): ReactElement => {
  const { mode } = route.params;
  const { walletService } = useContainer();
  const bumpRevision = useSessionStore(state => state.bumpRevision);
  const showToast = useToastStore(state => state.show);
  const [secret, setSecret] = useState('');
  const [accountName, setAccountName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (): Promise<void> => {
    setSubmitting(true);

    try {
      const account = mode === SecretImportMode.MNEMONIC
        ? await walletService.addMnemonicKeyring(secret, password, accountName)
        : await walletService.importPrivateKey(secret, password, accountName);

      bumpRevision();
      showToast(`${account.name} imported`, 'success');
      navigation.popToTop();
    }
    catch (submitError) {
      setError(isAppError(submitError, AppErrorCode.INVALID_PASSWORD) ? 'Incorrect password.' : toErrorMessage(submitError));
    }
    finally {
      setSubmitting(false);
    }
  };

  const handleChangeSecret = (value: string): void => {
    setSecret(value);
    setError(undefined);
  };

  const handleChangePassword = (value: string): void => {
    setPassword(value);
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
      password={password}
      onChangePassword={handleChangePassword}
      error={error}
      submitting={submitting}
      submitLabel='Import'
      onSubmit={submit}
      onBack={navigation.goBack}
    />
  );
};
