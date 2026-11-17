import AddSymbol from '@assets/add-symbol.svg';
import EditSymbol from '@assets/edit-symbol.svg';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useLayoutEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {
  ADDRESS_LABEL_LIMIT,
  AddressBookEntryError,
  AddressBookItem,
  CHAIN_LABELS,
  chainOfAddress,
  sanitizeAddressInput,
  validateAddressBookEntry,
} from '../../core/address-book';
import {useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {ButtonPair, ErrorText, Field, Screen} from '../../ui/components';
import {useModal} from '../../ui/modal';
import {colors, fonts} from '../../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'AddressEdit'>;

/** The popup's add/edit address screen; edit also offers removal. */
export function AddressEditScreen({navigation, route}: Props) {
  const {base, wallet} = useWallet();
  const {confirm} = useModal();
  const editingId = route.params?.id;
  const isAdd = !editingId;
  const [all, setAll] = useState<AddressBookItem[] | null>(null);
  const [current, setCurrent] = useState<AddressBookItem | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<AddressBookEntryError | null>(null);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({title: isAdd ? 'Add Address' : 'Edit Address'});
  }, [navigation, isAdd]);

  useEffect(() => {
    base.addressBookService
      .getAddressBook()
      .catch(() => [])
      .then(loaded => {
        setAll(loaded);
        const found = loaded.find(item => item.id === editingId) ?? null;
        if (found) {
          setCurrent(found);
          setName(found.name);
          setAddress(found.address);
        }
      });
  }, [base, editingId]);

  const chain = chainOfAddress(address, base.chainRegistry);

  const save = async () => {
    if (!all) {
      return;
    }
    const entry: AddressBookItem = {
      id: current?.id ?? '',
      name,
      address,
      createdAt: current?.createdAt ?? '',
    };
    setSaving(true);
    try {
      const failure = await validateAddressBookEntry(
        entry,
        all,
        wallet?.accounts ?? [],
        base.chainRegistry,
        isAdd,
      );
      if (failure) {
        setError(failure);
        return;
      }
      if (current) {
        await base.addressBookService.updateAddressBookItemById({
          id: current.id,
          name,
          address,
        });
      } else {
        await base.addressBookService.addAddressBookItem({name, address});
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!current) {
      return;
    }
    const ok = await confirm({
      title: 'Remove Address',
      message: `Remove “${current.name}” from the address book?`,
      detail: current.address,
      confirmText: 'Remove',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    await base.addressBookService.removeAddressBookItemByAccountId(
      '',
      current.id,
    );
    navigation.goBack();
  };

  return (
    <Screen
      footer={
        <ButtonPair
          cancel={{title: 'Cancel', onPress: () => navigation.goBack()}}
          confirm={{
            title: 'Save',
            testID: 'address-save',
            disabled: !name || !address || !all,
            loading: saving,
            onPress: save,
          }}
        />
      }>
      <View style={styles.symbol}>
        {isAdd ? <AddSymbol /> : <EditSymbol />}
      </View>
      <Field
        label="Label"
        hideLabel
        placeholder="Label"
        value={name}
        maxLength={ADDRESS_LABEL_LIMIT}
        error={error?.field === 'name'}
        onChangeText={text => {
          setName(text);
          setError(null);
        }}
      />
      <Field
        label="Address"
        hideLabel
        placeholder="Address"
        value={address}
        multiline
        error={error?.field === 'address'}
        onChangeText={text => {
          setAddress(sanitizeAddressInput(text));
          setError(null);
        }}
      />
      {chain && !error && (
        <Text style={styles.chain}>
          {CHAIN_LABELS[chain.chainGroup] ?? chain.chainGroup} address
        </Text>
      )}
      <ErrorText>{error?.message}</ErrorText>
      {!isAdd && (
        <Pressable
          accessibilityRole="button"
          onPress={remove}
          style={styles.remove}>
          <Text style={styles.removeText}>Remove Address</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  symbol: {alignSelf: 'center', marginVertical: 24},
  chain: {...fonts.captionReg, color: colors.textMuted, paddingHorizontal: 16},
  remove: {alignSelf: 'center', marginTop: 16, padding: 4},
  removeText: {
    ...fonts.body1Reg,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
