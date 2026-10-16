import {formatAddress, formatNickname} from '@common/utils/client-utils';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {isHDWalletKeyring, isSessionAccount} from 'adena-module';
import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {accountDisplayName, useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {Body, Button, Screen} from '../../ui/components';
import {ChevronRightIcon} from '../../ui/icons';
import {useModal} from '../../ui/modal';
import {colors, colorTokens, fonts, radius} from '../../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'Accounts'>;

/** The popup's account list: switch, open details, add the next account. */
export function AccountsScreen({navigation}: Props) {
  const {wallet, account, net, accountNames, switchAccount, addAccount} =
    useWallet();
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const {inform} = useModal();
  const prefix = net?.network.addressPrefix ?? 'g';
  // Session accounts sign for a master account; the list shows master ones.
  const accounts = (wallet?.accounts ?? []).filter(
    item => !isSessionAccount(item),
  );
  const canAdd = !!wallet?.keyrings.some(isHDWalletKeyring);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        (wallet?.accounts ?? []).map(
          async item => [item.id, await item.getAddress(prefix)] as const,
        ),
      );
      if (!cancelled) {
        setAddresses(Object.fromEntries(entries));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet, prefix]);

  const add = async () => {
    setAdding(true);
    try {
      if (!(await addAccount())) {
        await inform('Add Account', 'This wallet has no seed phrase.');
        return;
      }
      navigation.goBack();
    } finally {
      setAdding(false);
    }
  };

  return (
    <Screen
      footer={
        <>
          {!canAdd && (
            <Body muted center>
              Accounts can only be added to a wallet created or imported with
              a seed phrase.
            </Body>
          )}
          <Button
            testID="accounts-add"
            variant="secondary"
            title="Add Account"
            disabled={!canAdd}
            loading={adding}
            onPress={add}
          />
        </>
      }>
      {accounts.map(item => {
        const current = item.id === account?.id;
        return (
          <View key={item.id} style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{selected: current}}
              onPress={async () => {
                if (!current) {
                  await switchAccount(item.id);
                }
                navigation.goBack();
              }}
              style={({pressed}) => [styles.main, pressed && styles.pressed]}>
              <View style={[styles.dot, current && styles.dotCurrent]} />
              <View style={styles.names}>
                <Text style={styles.name} numberOfLines={1}>
                  {formatNickname(accountDisplayName(item, accountNames), 20)}
                </Text>
                <Text style={styles.address}>
                  {addresses[item.id] ? formatAddress(addresses[item.id]) : ''}
                </Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Details of ${accountDisplayName(
                item,
                accountNames,
              )}`}
              hitSlop={8}
              onPress={() =>
                navigation.navigate('AccountDetails', {accountId: item.id})
              }
              style={styles.detail}>
              <ChevronRightIcon />
            </Pressable>
          </View>
        );
      })}
    </Screen>
  );
}

const {neutral} = colorTokens;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: neutral._9,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 16,
  },
  pressed: {opacity: 0.8},
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: neutral._5,
  },
  dotCurrent: {backgroundColor: colors.primary, borderColor: colors.primary},
  names: {flex: 1},
  name: {...fonts.body2Bold, color: colors.text},
  address: {...fonts.captionReg, color: colors.textMuted},
  detail: {paddingHorizontal: 16, paddingVertical: 18},
});
