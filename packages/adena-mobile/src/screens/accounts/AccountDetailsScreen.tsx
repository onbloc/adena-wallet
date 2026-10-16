import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';

import {accountDisplayName, useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {useReauth} from '../../security/reauth';
import {Address} from '../../ui/address';
import {Body, Button, Field, Screen} from '../../ui/components';
import {colors, colorTokens, fonts, radius} from '../../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'AccountDetails'>;

/** The extension's account-name limit. */
export const ACCOUNT_NAME_LIMIT = 23;

/** The popup's account details: name, full address, removal. */
export function AccountDetailsScreen({navigation, route}: Props) {
  const {accountId} = route.params;
  const {wallet, net, accountNames, renameAccount, removeAccount} = useWallet();
  const requestReauth = useReauth();
  const target = wallet?.accounts.find(item => item.id === accountId);
  const savedName = target ? accountDisplayName(target, accountNames) : '';
  const [name, setName] = useState(savedName);
  const [address, setAddress] = useState('');
  const isLast = (wallet?.accounts.length ?? 0) <= 1;

  useEffect(() => {
    if (target && net) {
      target.getAddress(net.network.addressPrefix).then(setAddress);
    }
  }, [target, net]);

  if (!target) {
    return (
      <Screen>
        <Body muted>This account no longer exists.</Body>
      </Screen>
    );
  }

  const remove = () => {
    Alert.alert(
      'Remove Account',
      'The account is removed from this device. A seed phrase account can be added again from the same phrase; a private key account only with its key.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!(await requestReauth('Remove this account'))) {
              return;
            }
            if (await removeAccount(accountId)) {
              navigation.goBack();
            }
          },
        },
      ],
    );
  };

  return (
    <Screen
      footer={
        <Button
          title="Save"
          testID="account-name-save"
          disabled={name.trim() === '' || name === savedName}
          onPress={async () => {
            await renameAccount(accountId, name);
            navigation.goBack();
          }}
        />
      }>
      <Field
        label="Account name"
        hideLabel
        placeholder="Account name"
        value={name}
        maxLength={ACCOUNT_NAME_LIMIT}
        onChangeText={setName}
      />
      <View style={styles.card}>
        <Text style={styles.label}>Address</Text>
        {address ? <Address value={address} /> : null}
      </View>
      {isLast ? (
        <Body muted center>
          The only account cannot be removed. Reset the wallet instead.
        </Body>
      ) : (
        <Pressable
          accessibilityRole="button"
          testID="account-remove"
          onPress={remove}
          style={styles.remove}>
          <Text style={styles.removeText}>Remove Account</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colorTokens.neutral._9,
  },
  label: {...fonts.captionReg, color: colors.textMuted},
  remove: {alignSelf: 'center', marginTop: 16, padding: 4},
  removeText: {
    ...fonts.body1Reg,
    color: colors.danger,
    textDecorationLine: 'underline',
  },
});
