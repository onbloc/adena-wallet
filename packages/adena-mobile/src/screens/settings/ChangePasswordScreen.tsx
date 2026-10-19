import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {
  isStrongEnoughPassword,
  passwordStrength,
  PasswordStrength,
} from '../../core/password-policy';
import {passwordErrorMessage} from '../../core/unlock-throttle';
import {useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {ButtonPair, ErrorText, Field, Screen} from '../../ui/components';
import {colorTokens, fonts} from '../../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'ChangePassword'>;

type FieldName = 'current' | 'next' | 'confirm';

const STRENGTH_COLOR: Record<PasswordStrength, string> = {
  Strong: colorTokens.webSuccess._100,
  Medium: colorTokens.webWarning._100,
  Weak: colorTokens.webError._100,
};

/** The popup's change-password screen and its error messages. */
export function ChangePasswordScreen({navigation}: Props) {
  const {changePassword} = useWallet();
  const [values, setValues] = useState<Record<FieldName, string>>({
    current: '',
    next: '',
    confirm: '',
  });
  const [error, setError] = useState<{field: FieldName; message: string}>();
  const [busy, setBusy] = useState(false);
  const strength = passwordStrength(values.next);

  const update = (field: FieldName) => (text: string) => {
    setValues(current => ({...current, [field]: text}));
    setError(undefined);
  };

  const submit = async () => {
    if (values.next === values.current) {
      setError({field: 'next', message: 'You can’t use your current password'});
      return;
    }
    if (!isStrongEnoughPassword(values.next)) {
      setError({field: 'next', message: 'Password is too simple.'});
      return;
    }
    if (values.next !== values.confirm) {
      setError({field: 'confirm', message: 'Passwords do not match'});
      return;
    }
    setBusy(true);
    const changed = await changePassword(values.current, values.next);
    setBusy(false);
    if (!changed.ok) {
      setError({
        field: 'current',
        message:
          changed.waitMs > 0
            ? passwordErrorMessage(changed.waitMs)
            : 'Invalid password',
      });
      return;
    }
    navigation.goBack();
  };

  return (
    <Screen
      footer={
        <ButtonPair
          cancel={{title: 'Cancel', onPress: () => navigation.goBack()}}
          confirm={{
            title: 'Save',
            onPress: submit,
            loading: busy,
            disabled: !values.current || !values.next || !values.confirm,
          }}
        />
      }>
      <Field
        label="Current Password"
        hideLabel
        placeholder="Current Password"
        secret
        value={values.current}
        error={error?.field === 'current'}
        onChangeText={update('current')}
      />
      <View>
        <Field
          label="New Password"
          hideLabel
          placeholder="New Password"
          secret
          value={values.next}
          error={error?.field === 'next'}
          onChangeText={update('next')}
          style={strength ? styles.withStrength : undefined}
        />
        {strength ? (
          <Text style={[styles.strength, {color: STRENGTH_COLOR[strength]}]}>
            {strength}
          </Text>
        ) : null}
      </View>
      <Field
        label="Confirm New Password"
        hideLabel
        placeholder="Confirm New Password"
        secret
        value={values.confirm}
        error={error?.field === 'confirm'}
        onChangeText={update('confirm')}
      />
      <ErrorText>{error?.message}</ErrorText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  withStrength: {paddingRight: 72},
  strength: {
    ...fonts.body3Reg,
    position: 'absolute',
    right: 16,
    top: 13,
  },
});
