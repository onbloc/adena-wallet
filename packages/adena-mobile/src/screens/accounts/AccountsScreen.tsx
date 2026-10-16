import {formatAddress, formatNickname} from '@common/utils/client-utils';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {isHDWalletKeyring, isSessionAccount} from 'adena-module';
import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {accountDisplayName, useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {Button, Screen} from '../../ui/components';
import {
  ChevronRightIcon,
  ImportIcon,
  SeedPhraseIcon,
  UserPlusIcon,
} from '../../ui/icons';
import {useModal} from '../../ui/modal';
import {colors, colorTokens, fonts, radius} from '../../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'Accounts'>;

/** The web secondary button's text blue, on the option tiles. */
const OPTION_ICON = '#ADCAFF';

/**
 * The popup's account list: switch, open details, add accounts (next of a
 * seed phrase, a new phrase, or an imported phrase or private key).
 */
export function AccountsScreen({navigation}: Props) {
  const {wallet, account, net, accountNames, switchAccount, addAccount} =
    useWallet();
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const {inform, chooseOption} = useModal();
  const prefix = net?.network.addressPrefix ?? 'g';
  // Session accounts sign for a master account; the list shows master ones.
  const accounts = (wallet?.accounts ?? []).filter(
    item => !isSessionAccount(item),
  );
  const seedKeyrings = (wallet?.keyrings ?? []).filter(isHDWalletKeyring);

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

  // The next account of a seed phrase; which one, when there are several.
  const createAccount = async () => {
    let keyringId = seedKeyrings[0]?.id;
    if (seedKeyrings.length > 1) {
      const chosen = await chooseOption(
        'Select Seed Phrase',
        seedKeyrings.map((keyring, index) => {
          const count = (wallet?.accounts ?? []).filter(
            item => item.keyringId === keyring.id,
          ).length;
          return {
            label: `Seed Phrase ${index + 1}`,
            description: `${count} account${count === 1 ? '' : 's'}`,
            icon: <SeedPhraseIcon color={OPTION_ICON} />,
          };
        }),
      );
      if (chosen === null) {
        return;
      }
      keyringId = seedKeyrings[chosen].id;
    }
    setAdding(true);
    try {
      if (!(await addAccount(keyringId))) {
        await inform('Add Account', 'This wallet has no seed phrase.');
        return;
      }
      navigation.goBack();
    } finally {
      setAdding(false);
    }
  };

  const add = async () => {
    const options = [
      ...(seedKeyrings.length > 0
        ? [
            {
              label: 'Create New Account',
              description: 'The next account of a seed phrase in this wallet.',
              icon: <UserPlusIcon color={OPTION_ICON} />,
              run: createAccount,
            },
          ]
        : []),
      {
        label: 'Create New Seed Phrase',
        description: 'A new 12 or 24-word phrase with its first account.',
        icon: <SeedPhraseIcon color={OPTION_ICON} />,
        run: async () => navigation.navigate('AddSeedPhrase'),
      },
      {
        label: 'Import Existing Account',
        description: 'From a seed phrase or a private key.',
        icon: <ImportIcon color={OPTION_ICON} />,
        run: async () => navigation.navigate('ImportAccount'),
      },
    ];
    const chosen = await chooseOption('Add Account', options);
    if (chosen !== null) {
      await options[chosen].run();
    }
  };

  return (
    <Screen
      footer={
        <Button
          testID="accounts-add"
          variant="secondary"
          title="Add Account"
          loading={adding}
          onPress={add}
        />
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
