import PlusIcon from '@assets/plus.svg';
import {formatAddress, formatNickname} from '@common/utils/client-utils';
import {
  NavigationProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useLayoutEffect, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AddressBookItem,
  CHAIN_LABELS,
  chainOfAddress,
} from '../../core/address-book';
import {useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {Screen} from '../../ui/components';
import {colors, colorTokens, fonts, radius} from '../../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'AddressBook'>;

/** The popup's address book: one row per saved address, tap to edit. */
export function AddressBookScreen({navigation}: Props) {
  const {base} = useWallet();
  const [items, setItems] = useState<AddressBookItem[] | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({headerRight: renderAddAddressButton});
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      base.addressBookService
        .getAddressBook()
        .catch(() => [])
        .then(loaded => {
          if (!cancelled) {
            setItems(loaded);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [base]),
  );

  if (items === null) {
    return (
      <Screen>
        <ActivityIndicator color={colors.textMuted} />
      </Screen>
    );
  }

  return (
    <Screen>
      {items.length === 0 ? (
        <Text style={styles.empty}>No addresses to display</Text>
      ) : (
        items.map(item => {
          const chain = chainOfAddress(item.address, base.chainRegistry);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => navigation.navigate('AddressEdit', {id: item.id})}
              style={({pressed}) => [styles.row, pressed && styles.pressed]}>
              <Text style={styles.name} numberOfLines={1}>
                {formatNickname(item.name, 15)}
              </Text>
              <View style={styles.right}>
                {chain && (
                  <Text style={styles.chain}>
                    {CHAIN_LABELS[chain.chainGroup] ?? chain.chainGroup}
                  </Text>
                )}
                <Text style={styles.address}>{formatAddress(item.address)}</Text>
              </View>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

function AddAddressButton() {
  const navigation = useNavigation<NavigationProp<MainStackParams>>();
  return (
    <Pressable
      testID="address-book-add"
      accessibilityRole="button"
      accessibilityLabel="Add address"
      hitSlop={10}
      onPress={() => navigation.navigate('AddressEdit')}>
      <PlusIcon width={24} height={24} />
    </Pressable>
  );
}

// React Navigation calls headerRight as a plain function, so the button's
// hooks must live in a component rendered from it.
const renderAddAddressButton = () => <AddAddressButton />;

const {neutral} = colorTokens;

const styles = StyleSheet.create({
  empty: {
    ...fonts.body1Reg,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 160,
  },
  row: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    borderRadius: radius.md,
    backgroundColor: neutral._9,
    gap: 8,
  },
  pressed: {backgroundColor: neutral._7},
  name: {...fonts.body2Bold, color: colors.text, flexShrink: 1},
  right: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chain: {...fonts.captionReg, color: colors.textMuted},
  address: {...fonts.body2Reg, color: colors.textMuted},
});
