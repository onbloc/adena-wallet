import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useState} from 'react';

import {isStrongEnoughPassword} from '../../core/password-policy';
import {useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {Button, ErrorText, Field, Screen, Title} from '../../ui/components';

type Props = NativeStackScreenProps<MainStackParams, 'ChangePassword'>;

export function ChangePasswordScreen({navigation}: Props) {
  const {changePassword} = useWallet();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!isStrongEnoughPassword(next)) {
      setError('The new password is too weak.');
      return;
    }
    if (next !== confirm) {
      setError('The new passwords do not match.');
      return;
    }
    setBusy(true);
    const changed = await changePassword(current, next);
    setBusy(false);
    if (!changed) {
      setError('The current password is incorrect.');
      return;
    }
    navigation.goBack();
  };

  return (
    <Screen>
      <Title>Change password</Title>
      <Field
        label="Current password"
        secret
        value={current}
        onChangeText={setCurrent}
      />
      <Field label="New password" secret value={next} onChangeText={setNext} />
      <Field
        label="Confirm new password"
        secret
        value={confirm}
        onChangeText={setConfirm}
      />
      <ErrorText>{error}</ErrorText>
      <Button
        title="Change"
        onPress={submit}
        loading={busy}
        disabled={!current || !next || !confirm}
      />
    </Screen>
  );
}
